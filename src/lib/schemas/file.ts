import { z } from 'zod';

export const fileSchema = z.object({
	id: z.uuid(),
	organization_id: z.uuid(),
	filename: z.string(),
	original_filename: z.string(),
	content_type: z.string(),
	size_bytes: z.number(),
	r2_key: z.string(),
	uploaded_by: z.uuid(),
	created_at: z.date(),
	updated_at: z.date()
});

export const fileUploadSchema = z.object({
	file_type: z.enum(['photo', 'document', 'other']).optional().default('other')
});

export type File = z.infer<typeof fileSchema>;
export type FileUpload = z.infer<typeof fileUploadSchema>;
