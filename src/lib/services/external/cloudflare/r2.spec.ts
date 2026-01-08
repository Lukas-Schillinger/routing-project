import { env } from '$env/dynamic/private';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { R2Service } from './r2';

const RUN_METERED = env.RUN_METERED === '1';

// Integration test
describe.skipIf(!RUN_METERED)('R2Service Integration Tests', () => {
	let r2Service: R2Service;
	let uploadedKeys: string[] = [];

	beforeEach(() => {
		r2Service = new R2Service();
		uploadedKeys = [];
	});

	afterEach(async () => {
		// Cleanup: delete all uploaded test files
		for (const key of uploadedKeys) {
			try {
				await r2Service.deleteFile(key);
			} catch (error) {
				console.warn(`Failed to cleanup test file ${key}:`, error);
			}
		}
	});

	describe('uploadFile', () => {
		it('should upload file to Cloudflare R2 dev bucket', async () => {
			const testContent = 'Hello, Cloudflare R2!';
			const fileBuffer = new TextEncoder().encode(testContent);
			const key = `test/integration-test-${Date.now()}.txt`;
			uploadedKeys.push(key);

			// Upload should complete without throwing
			await expect(
				r2Service.uploadFile(key, fileBuffer, 'text/plain')
			).resolves.toBeUndefined();
		});
	});

	describe('getSignedDownloadUrl', () => {
		it('should generate signed URL for uploaded file', async () => {
			const testContent = 'Test content for signed URL';
			const fileBuffer = new TextEncoder().encode(testContent);
			const key = `test/signed-url-test-${Date.now()}.txt`;
			uploadedKeys.push(key);

			// Upload file first
			await r2Service.uploadFile(key, fileBuffer, 'text/plain');

			// Generate signed URL
			const signedUrl = await r2Service.getSignedDownloadUrl(key, 300); // 5 minutes

			expect(signedUrl).toMatch(
				/^https:\/\/.*\.r2\.cloudflarestorage\.com.*X-Amz-Signature/
			);
			expect(signedUrl).toContain(env.CLOUDFLARE_R2_DEV_BUCKET_NAME);
		});
	});

	describe('deleteFile', () => {
		it('should delete uploaded file', async () => {
			const testContent = 'File to be deleted';
			const fileBuffer = new TextEncoder().encode(testContent);
			const key = `test/delete-test-${Date.now()}.txt`;

			// Upload file
			await r2Service.uploadFile(key, fileBuffer, 'text/plain');

			// Delete should complete without throwing
			await expect(r2Service.deleteFile(key)).resolves.toBeUndefined();

			// Remove from cleanup list since we already deleted it
			uploadedKeys = uploadedKeys.filter((k) => k !== key);
		});
	});
});
