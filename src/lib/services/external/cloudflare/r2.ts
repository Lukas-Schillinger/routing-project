import { env } from '$env/dynamic/private';
import { ServiceError } from '$lib/services/server/errors';
import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
		try {
			const command = new PutObjectCommand({
				Bucket: env.CLOUDFLARE_R2_DEV_BUCKET_NAME!,
				Key: key,
				Body: file,
				ContentType: contentType,
				Metadata: metadata
			});

			await this.client.send(command);
		} catch (error) {
			throw ServiceError.internal(`Failed to upload file: ${error}`);
		}
	}

	async deleteFile(key: string): Promise<void> {
		try {
			const command = new DeleteObjectCommand({
				Bucket: env.CLOUDFLARE_R2_DEV_BUCKET_NAME!,
				Key: key
			});

			await this.client.send(command);
		} catch (error) {
			throw ServiceError.internal(`Failed to delete file: ${error}`);
		}
	}

	async getSignedDownloadUrl(
		key: string,
		expiresIn: number = 3600
	): Promise<string> {
		try {
			const command = new GetObjectCommand({
				Bucket: env.CLOUDFLARE_R2_DEV_BUCKET_NAME!,
				Key: key
			});

			return await getSignedUrl(this.client, command, { expiresIn });
		} catch (error) {
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
