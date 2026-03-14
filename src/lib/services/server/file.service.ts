import { FILE_LIMITS } from '$lib/config/constants';
import type { File as FileSchema } from '$lib/schemas/file';
import type { User } from '$lib/schemas/user';
import { db } from '$lib/server/db';
import { files } from '$lib/server/db/schema';
import { r2Service as defaultStorageProvider } from '$lib/services/external/cloudflare/r2';
import { and, eq } from 'drizzle-orm';
import { ServiceError } from './errors';

export type FileStorageProvider = {
	uploadFile(
		key: string,
		file: Buffer | Uint8Array,
		contentType: string,
		metadata?: Record<string, string>
	): Promise<void>;
	deleteFile(key: string): Promise<void>;
	getSignedDownloadUrl(key: string, expiresIn?: number): Promise<string>;
	generateFileKey(
		organizationId: string,
		userId: string,
		originalFilename: string
	): string;
};

export class FileService {
	private storage: FileStorageProvider;

	constructor(storage: FileStorageProvider = defaultStorageProvider) {
		this.storage = storage;
	}

	async getFileById(
		fileId: string,
		organizationId: string
	): Promise<FileSchema> {
		const [fileRecord] = await db
			.select()
			.from(files)
			.where(
				and(eq(files.id, fileId), eq(files.organization_id, organizationId))
			)
			.limit(1);

		if (!fileRecord) {
			throw ServiceError.notFound('File not found');
		}

		return fileRecord;
	}

	async uploadFile(
		file: File,
		user: User,
		metadata?: Record<string, string>
	): Promise<FileSchema> {
		if (file.size > FILE_LIMITS.MAX_SIZE_BYTES) {
			throw ServiceError.badRequest('File size exceeds 10MB limit');
		}

		try {
			const r2Key = this.storage.generateFileKey(
				user.organization_id!,
				user.id,
				file.name
			);

			const fileBuffer = await file.arrayBuffer();
			await this.storage.uploadFile(
				r2Key,
				new Uint8Array(fileBuffer),
				file.type,
				metadata
			);

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
			throw ServiceError.internal('Failed to upload file', { cause: error });
		}
	}

	async deleteFile(fileId: string, user: User): Promise<{ success: true }> {
		const fileRecord = await this.getFileById(fileId, user.organization_id!);

		try {
			await this.storage.deleteFile(fileRecord.r2_key);
			await db
				.delete(files)
				.where(
					and(
						eq(files.id, fileId),
						eq(files.organization_id, user.organization_id!)
					)
				);
		} catch (error) {
			throw ServiceError.internal('Failed to delete file', { cause: error });
		}

		return { success: true };
	}

	async getFileUrl(fileId: string, user: User): Promise<string> {
		const fileRecord = await this.getFileById(fileId, user.organization_id!);

		return this.storage.getSignedDownloadUrl(fileRecord.r2_key);
	}

	async getFilesByOrganization(user: User): Promise<FileSchema[]> {
		return db
			.select()
			.from(files)
			.where(eq(files.organization_id, user.organization_id!))
			.orderBy(files.created_at);
	}
}

export const fileService = new FileService();
