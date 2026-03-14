import { FILE_LIMITS } from '$lib/config/constants';
import { createMockR2Service } from '$lib/testing/mocks';
import { createTestEnvironment, withTestTransaction } from '$lib/testing';
import { db } from '$lib/testing/db';
import { files } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { FileService } from './file.service';

/**
 * File Service Tests
 *
 * Uses withTestTransaction for automatic rollback.
 * R2 dependency is injected directly — no module mocking needed.
 */

const mockR2 = createMockR2Service();
const fileService = new FileService(mockR2);

const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

/** Create a mock Web API File object */
function createTestFile(
	name: string,
	size: number,
	type = 'application/pdf'
): File {
	const buffer = new ArrayBuffer(size);
	return new File([buffer], name, { type });
}

/** Run a test with a fresh test environment inside a transaction */
async function withFileTest(
	fn: (ctx: Awaited<ReturnType<typeof createTestEnvironment>>) => Promise<void>
) {
	await withTestTransaction(async () => {
		const env = await createTestEnvironment();
		await fn(env);
	});
}

beforeEach(() => {
	mockR2.clear();
});

describe('FileService', () => {
	describe('uploadFile()', () => {
		it('uploads file to R2 and saves to database', async () => {
			await withFileTest(async ({ user }) => {
				const file = createTestFile('report.pdf', 1024);

				const result = await fileService.uploadFile(file, user);

				expect(result.id).toBeDefined();
				expect(result.original_filename).toBe('report.pdf');
				expect(result.content_type).toBe('application/pdf');
				expect(result.size_bytes).toBe(1024);
				expect(result.organization_id).toBe(user.organization_id);
				expect(result.uploaded_by).toBe(user.id);
				expect(result.r2_key).toContain(user.organization_id);

				const r2Calls = mockR2.getCalls();
				expect(r2Calls.upload).toHaveLength(1);
				expect(r2Calls.generateKey).toHaveLength(1);
			});
		});

		it('passes metadata to R2 upload', async () => {
			await withFileTest(async ({ user }) => {
				const file = createTestFile('doc.pdf', 512);
				const metadata = { category: 'invoice' };

				await fileService.uploadFile(file, user, metadata);

				expect(mockR2.getCalls().upload[0].metadata).toEqual({
					category: 'invoice'
				});
			});
		});

		it('rejects files exceeding size limit', async () => {
			await withFileTest(async ({ user }) => {
				const oversizedFile = createTestFile(
					'huge.pdf',
					FILE_LIMITS.MAX_SIZE_BYTES + 1
				);

				await expect(
					fileService.uploadFile(oversizedFile, user)
				).rejects.toMatchObject({
					code: 'BAD_REQUEST',
					message: 'File size exceeds 10MB limit'
				});

				expect(mockR2.getCalls().upload).toHaveLength(0);
			});
		});

		it('accepts files at exactly the size limit', async () => {
			await withFileTest(async ({ user }) => {
				const maxFile = createTestFile('max.pdf', FILE_LIMITS.MAX_SIZE_BYTES);

				const result = await fileService.uploadFile(maxFile, user);

				expect(result.size_bytes).toBe(FILE_LIMITS.MAX_SIZE_BYTES);
			});
		});

		it('wraps R2 failures in internal error', async () => {
			await withFileTest(async ({ user }) => {
				const file = createTestFile('fail.pdf', 256);
				mockR2.setNextError(new Error('R2 unavailable'));

				await expect(fileService.uploadFile(file, user)).rejects.toMatchObject({
					code: 'INTERNAL_ERROR'
				});
			});
		});
	});

	describe('deleteFile()', () => {
		it('deletes file from R2 and database', async () => {
			await withFileTest(async ({ user }) => {
				const uploaded = await fileService.uploadFile(
					createTestFile('to-delete.pdf', 512),
					user
				);

				await fileService.deleteFile(uploaded.id, user);

				expect(mockR2.getCalls().delete).toHaveLength(1);
				expect(mockR2.getCalls().delete[0].key).toBe(uploaded.r2_key);

				const dbRecords = await db
					.select()
					.from(files)
					.where(eq(files.id, uploaded.id));
				expect(dbRecords).toHaveLength(0);
			});
		});

		it('throws NOT_FOUND for non-existent file', async () => {
			await withFileTest(async ({ user }) => {
				await expect(
					fileService.deleteFile(NON_EXISTENT_UUID, user)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('prevents cross-tenant file deletion', async () => {
			await withFileTest(async ({ user: user1 }) => {
				const { user: user2 } = await createTestEnvironment();
				const uploaded = await fileService.uploadFile(
					createTestFile('private.pdf', 256),
					user1
				);

				await expect(
					fileService.deleteFile(uploaded.id, user2)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });

				// File still exists for original owner
				const result = await fileService.getFileById(
					uploaded.id,
					user1.organization_id!
				);
				expect(result.id).toBe(uploaded.id);
			});
		});

		it('wraps R2 failures in internal error', async () => {
			await withFileTest(async ({ user }) => {
				const uploaded = await fileService.uploadFile(
					createTestFile('fail-delete.pdf', 256),
					user
				);
				mockR2.clearCalls();
				mockR2.setNextError(new Error('R2 delete failed'));

				await expect(
					fileService.deleteFile(uploaded.id, user)
				).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
			});
		});
	});

	describe('getFileUrl()', () => {
		it('returns signed URL for existing file', async () => {
			await withFileTest(async ({ user }) => {
				const uploaded = await fileService.uploadFile(
					createTestFile('download.pdf', 1024),
					user
				);

				const url = await fileService.getFileUrl(uploaded.id, user);

				expect(url).toContain('mock-r2.test');
				expect(url).toContain(uploaded.r2_key);
				expect(mockR2.getCalls().getSignedUrl).toHaveLength(1);
			});
		});

		it('throws NOT_FOUND for non-existent file', async () => {
			await withFileTest(async ({ user }) => {
				await expect(
					fileService.getFileUrl(NON_EXISTENT_UUID, user)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('prevents cross-tenant URL access', async () => {
			await withFileTest(async ({ user: user1 }) => {
				const { user: user2 } = await createTestEnvironment();
				const uploaded = await fileService.uploadFile(
					createTestFile('secret.pdf', 256),
					user1
				);

				await expect(
					fileService.getFileUrl(uploaded.id, user2)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	describe('getFileById()', () => {
		it('returns file record for existing file', async () => {
			await withFileTest(async ({ user }) => {
				const uploaded = await fileService.uploadFile(
					createTestFile('lookup.pdf', 2048),
					user
				);

				const result = await fileService.getFileById(
					uploaded.id,
					user.organization_id!
				);

				expect(result.id).toBe(uploaded.id);
				expect(result.original_filename).toBe('lookup.pdf');
				expect(result.size_bytes).toBe(2048);
				expect(result.organization_id).toBe(user.organization_id);
			});
		});

		it('throws NOT_FOUND for non-existent file', async () => {
			await withFileTest(async ({ user }) => {
				await expect(
					fileService.getFileById(NON_EXISTENT_UUID, user.organization_id!)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('prevents cross-tenant file access', async () => {
			await withFileTest(async ({ user: user1 }) => {
				const { user: user2 } = await createTestEnvironment();
				const uploaded = await fileService.uploadFile(
					createTestFile('org1-only.pdf', 256),
					user1
				);

				await expect(
					fileService.getFileById(uploaded.id, user2.organization_id!)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	describe('getFilesByOrganization()', () => {
		it('returns all files for an organization', async () => {
			await withFileTest(async ({ user }) => {
				await fileService.uploadFile(createTestFile('file1.pdf', 100), user);
				await fileService.uploadFile(createTestFile('file2.pdf', 200), user);

				const result = await fileService.getFilesByOrganization(user);

				expect(result).toHaveLength(2);
				const filenames = result.map((f) => f.original_filename);
				expect(filenames).toContain('file1.pdf');
				expect(filenames).toContain('file2.pdf');
			});
		});

		it('returns empty array when no files exist', async () => {
			await withFileTest(async ({ user }) => {
				const result = await fileService.getFilesByOrganization(user);

				expect(result).toHaveLength(0);
			});
		});

		it('does not return files from other organizations', async () => {
			await withFileTest(async ({ user: user1 }) => {
				const { user: user2 } = await createTestEnvironment();
				await fileService.uploadFile(createTestFile('org1.pdf', 100), user1);
				await fileService.uploadFile(createTestFile('org2.pdf', 200), user2);

				const result1 = await fileService.getFilesByOrganization(user1);
				const result2 = await fileService.getFilesByOrganization(user2);

				expect(result1).toHaveLength(1);
				expect(result1[0].original_filename).toBe('org1.pdf');
				expect(result2).toHaveLength(1);
				expect(result2[0].original_filename).toBe('org2.pdf');
			});
		});
	});
});
