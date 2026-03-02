import { z } from 'zod';
import { emailSchema } from './common.js';

export const adjustCreditsSchema = z.object({
	amount: z.coerce
		.number({ message: 'Amount must be a number' })
		.int('Must be a whole number'),
	type: z.enum(['adjustment', 'refund']),
	description: z.string().min(1, 'Description is required')
});

export type AdjustCreditsInput = z.infer<typeof adjustCreditsSchema>;

export const createTestAccountSchema = z.object({
	email: emailSchema,
	name: z.string().max(200).optional(),
	organizationName: z.string().max(200).optional()
});

export type CreateTestAccountInput = z.infer<typeof createTestAccountSchema>;
