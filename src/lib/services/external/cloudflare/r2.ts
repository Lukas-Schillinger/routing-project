import { env } from '$env/dynamic/private';
import { logger } from '$lib/server/logger';
import { ServiceError } from '$lib/services/server/errors';
import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const log = logger.child({ service: 'r2' });

export class R2Service {
	private client: S3Client;

	constructor() {
		this.client = new S3Client({
			region: 'auto',
			endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
				secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!
			}
		});
	}

	async uploadFile(
		key: string,
		file: Buffer | Uint8Array,
		contentType: string,
		metadata?: Record<string, string>
	): Promise<void> {
		const size = file.length;
		log.info({ key, contentType, size }, 'Uploading file');

		try {
			const command = new PutObjectCommand({
				Bucket: env.CLOUDFLARE_R2_DEV_BUCKET_NAME!,
				Key: key,
				Body: file,
				ContentType: contentType,
				Metadata: metadata
			});

			await this.client.send(command);
			log.info({ key, size }, 'File uploaded');
		} catch (error) {
			log.error({ key, error: String(error) }, 'File upload failed');
			throw ServiceError.internal(`Failed to upload file: ${error}`);
		}
	}

	async deleteFile(key: string): Promise<void> {
		log.info({ key }, 'Deleting file');

		try {
			const command = new DeleteObjectCommand({
				Bucket: env.CLOUDFLARE_R2_DEV_BUCKET_NAME!,
				Key: key
			});

			await this.client.send(command);
			log.info({ key }, 'File deleted');
		} catch (error) {
			log.error({ key, error: String(error) }, 'File deletion failed');
			throw ServiceError.internal(`Failed to delete file: ${error}`);
		}
	}

	async getSignedDownloadUrl(
		key: string,
		expiresIn: number = 3600
	): Promise<string> {
		log.debug({ key, expiresIn }, 'Generating signed URL');

		try {
			const command = new GetObjectCommand({
				Bucket: env.CLOUDFLARE_R2_DEV_BUCKET_NAME!,
				Key: key
			});

			const url = await getSignedUrl(this.client, command, { expiresIn });
			log.debug({ key }, 'Signed URL generated');
			return url;
		} catch (error) {
			log.error({ key, error: String(error) }, 'Signed URL generation failed');
			throw ServiceError.internal(`Failed to generate signed URL: ${error}`);
		}
	}

	generateFileKey(
		organizationId: string,
		userId: string,
		originalFilename: string
	): string {
		const timestamp = Date.now();
		const sanitizedName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_'); // Replace all characters not a letter or a number with '_'
		return `${organizationId}/${userId}/${timestamp}_${sanitizedName}`;
	}
}

export const r2Service = new R2Service();
