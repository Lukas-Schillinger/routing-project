import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { mapboxClient } from '$lib/services/external/mapbox';
import { GetQueueAttributesCommand, SQSClient } from '@aws-sdk/client-sqs';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import packageJson from '../../../../package.json';

const SERVICE_TIMEOUT_MS = 5000;
const startTime = Date.now();

type ServiceStatus = {
	status: 'healthy' | 'unhealthy';
	latency?: number;
	error?: string;
};

type HealthResponse = {
	status: 'healthy' | 'degraded' | 'unhealthy';
	version: string;
	timestamp: string;
	uptime: number;
	services: Record<string, ServiceStatus>;
};

async function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number
): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) =>
			setTimeout(() => reject(new Error('Timeout')), timeoutMs)
		)
	]);
}

async function checkService(
	check: () => Promise<void>
): Promise<ServiceStatus> {
	const start = Date.now();
	try {
		await withTimeout(check(), SERVICE_TIMEOUT_MS);
		return { status: 'healthy', latency: Date.now() - start };
	} catch (error) {
		return {
			status: 'unhealthy',
			latency: Date.now() - start,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

async function checkDatabase(): Promise<ServiceStatus> {
	return checkService(async () => {
		await db.execute(sql`SELECT 1`);
	});
}

async function checkMapbox(): Promise<ServiceStatus> {
	return checkService(async () => {
		await mapboxClient.get('/geocoding/v5/mapbox.places/test.json', {
			limit: '1'
		});
	});
}

async function checkResend(): Promise<ServiceStatus> {
	const start = Date.now();
	if (!env.RESEND_API_KEY) {
		return {
			status: 'unhealthy',
			latency: Date.now() - start,
			error: 'RESEND_API_KEY not configured'
		};
	}
	return { status: 'healthy', latency: Date.now() - start };
}

async function checkSqs(): Promise<ServiceStatus> {
	return checkService(async () => {
		if (
			!env.AWS_REGION ||
			!env.AWS_ACCESS_KEY_ID ||
			!env.AWS_SECRET_ACCESS_KEY ||
			!env.OPTIMIZATION_QUEUE_URL
		) {
			throw new Error('SQS environment variables not configured');
		}

		const sqsClient = new SQSClient({
			region: env.AWS_REGION,
			credentials: {
				accessKeyId: env.AWS_ACCESS_KEY_ID,
				secretAccessKey: env.AWS_SECRET_ACCESS_KEY
			}
		});

		await sqsClient.send(
			new GetQueueAttributesCommand({
				QueueUrl: env.OPTIMIZATION_QUEUE_URL,
				AttributeNames: ['ApproximateNumberOfMessages']
			})
		);
	});
}

async function checkR2(): Promise<ServiceStatus> {
	return checkService(async () => {
		if (
			!env.CLOUDFLARE_ACCOUNT_ID ||
			!env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
			!env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
			!env.CLOUDFLARE_R2_DEV_BUCKET_NAME
		) {
			throw new Error('R2 environment variables not configured');
		}

		const r2Client = new S3Client({
			region: 'auto',
			endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
				secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
			}
		});

		await r2Client.send(
			new HeadBucketCommand({
				Bucket: env.CLOUDFLARE_R2_DEV_BUCKET_NAME
			})
		);
	});
}

export const GET: RequestHandler = async () => {
	const [database, mapbox, resend, sqs, r2] = await Promise.all([
		checkDatabase(),
		checkMapbox(),
		checkResend(),
		checkSqs(),
		checkR2()
	]);

	const services = { database, mapbox, resend, sqs, r2 };

	const allHealthy = Object.values(services).every(
		(s) => s.status === 'healthy'
	);
	const databaseHealthy = database.status === 'healthy';

	let status: HealthResponse['status'];
	if (allHealthy) {
		status = 'healthy';
	} else if (databaseHealthy) {
		status = 'degraded';
	} else {
		status = 'unhealthy';
	}

	const response: HealthResponse = {
		status,
		version: packageJson.version,
		timestamp: new Date().toISOString(),
		uptime: Math.floor((Date.now() - startTime) / 1000),
		services
	};

	const httpStatus = status === 'unhealthy' ? 503 : 200;
	return json(response, { status: httpStatus });
};
