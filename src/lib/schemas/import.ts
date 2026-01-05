import { z } from 'zod';
import { locationCreateSchema } from './location';

/**
 * Import record - represents a single row from CSV import
 */
export const importRecordSchema = z.object({
	id: z.string().uuid(),
	raw: z.object({
		name: z.string().nullable(),
		address: z.string(),
		phone: z.string().nullable(),
		notes: z.string().nullable()
	}),
	location: locationCreateSchema.nullable(),
	status: z.enum(['pending', 'success', 'failed', 'edited'])
});

/**
 * Import state - shared across all import step components
 */
export const importStateSchema = z.object({
	file: z
		.object({
			name: z.string(),
			headers: z.array(z.string())
		})
		.nullable(),
	mapping: z
		.object({
			name: z.string().nullable(),
			address: z.string(),
			phone: z.string().nullable(),
			notes: z.string().nullable()
		})
		.nullable(),
	records: z.array(importRecordSchema),
	rawRows: z.array(z.record(z.string())).optional(),
	step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
	isProcessing: z.boolean()
});

export type ImportRecord = z.infer<typeof importRecordSchema>;
export type ImportState = z.infer<typeof importStateSchema>;

export function createImportState(): ImportState {
	return {
		file: null,
		mapping: null,
		records: [],
		rawRows: undefined,
		step: 1,
		isProcessing: false
	};
}

export function createImportRecord(raw: ImportRecord['raw']): ImportRecord {
	return {
		id: crypto.randomUUID(),
		raw,
		location: null,
		status: 'pending'
	};
}
