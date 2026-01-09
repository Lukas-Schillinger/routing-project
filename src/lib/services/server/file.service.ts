import { FILE_LIMITS } from '$lib/config';
import type { File as FileSchema } from '$lib/schemas/file';
import type { User } from '$lib/schemas/user';
import { db } from '$lib/server/db';
import { files } from '$lib/server/db/schema';
import { r2Service } from '$lib/services/external/cloudflare/r2';
import { and, eq } from 'drizzle-orm';
import { ServiceError } from './errors';

export class FileService {
	async uploadFile(
		file: File,
		user: User,
		metadata?: Record<string, string>
	): Promise<FileSchema> {
		try {
			// Validate file
			if (file.size > FILE_LIMITS.MAX_SIZE_BYTES) {
				throw ServiceError.badRequest('File size exceeds 10MB limit');
			}

			// Generate R2 key
			const r2Key = r2Service.generateFileKey(
				user.organization_id!,
				user.id,
				file.name
			);

			// Upload to R2
			const fileBuffer = await file.arrayBuffer();
			await r2Service.uploadFile(
				r2Key,
				new Uint8Array(fileBuffer),
				file.type,
				metadata
			);

			// Save to database
			const [savedFile] = await db
				.insert(files)
				.values({
					organization_id: user.organization_id!,
					filename: r2Key.split('/').pop()!,
					original_filename: file.name,
					content_type: file.type,
					size_bytes: file.size,
					r2_key: r2Key,
					uploaded_by: user.id
				})
				.returning();

			return savedFile;
		} catch (error) {
			if (error instanceof ServiceError) throw error;
			throw ServiceError.internal(`Failed to upload file: ${error}`);
		}
	}

	async deleteFile(fileId: string, user: User): Promise<void> {
		const fileRecord = await db
			.select()
			.from(files)
			.where(
				and(
					eq(files.id, fileId),
					eq(files.organization_id, user.organization_id!)
				)
			)
			.limit(1);

		if (!fileRecord.length) {
			throw ServiceError.notFound('File not found');
		}

		try {
			// Delete from R2
			await r2Service.deleteFile(fileRecord[0].r2_key);

			// Delete from database
			await db.delete(files).where(eq(files.id, fileId));
		} catch (error) {
			throw ServiceError.internal(`Failed to delete file: ${error}`);
		}
	}

	async getFileUrl(fileId: string, user: User): Promise<string> {
		const fileRecord = await db
			.select()
			.from(files)
			.where(
				and(
					eq(files.id, fileId),
					eq(files.organization_id, user.organization_id!)
				)
			)
			.limit(1);

		if (!fileRecord.length) {
			throw ServiceError.notFound('File not found');
		}

		// All files are private, return signed URL
		return await r2Service.getSignedDownloadUrl(fileRecord[0].r2_key);
	}

	async getFileById(fileId: string, user: User): Promise<FileSchema> {
		const [fileRecord] = await db
			.select()
			.from(files)
			.where(
				and(
					eq(files.id, fileId),
					eq(files.organization_id, user.organization_id!)
				)
			)
			.limit(1);

		if (!fileRecord) {
			throw ServiceError.notFound('File not found');
		}

		return fileRecord;
	}

	async getFilesByOrganization(user: User): Promise<FileSchema[]> {
		return await db
			.select()
			.from(files)
			.where(eq(files.organization_id, user.organization_id!))
			.orderBy(files.created_at);
	}
}

export const fileService = new FileService();
