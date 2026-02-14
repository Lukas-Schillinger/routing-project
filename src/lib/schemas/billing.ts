import { billingConfig } from '$lib/config/billing';
import { z } from 'zod';

// Validate returnUrl is a relative path (starts with / but not //) to prevent open redirect
const returnUrlSchema = z
	.string()
	.regex(/^\/(?!\/)/, 'Return URL must be a relative path')
	.optional();

export const creditPurchaseSchema = z.object({
	amount: z
		.number()
		.int()
		.min(
			billingConfig.minCreditPurchase,
			`Minimum purchase is ${billingConfig.minCreditPurchase} credits`
		),
	returnUrl: returnUrlSchema
});

export type CreditPurchaseInput = z.infer<typeof creditPurchaseSchema>;

export type CreditBalance = {
	available: number;
};
