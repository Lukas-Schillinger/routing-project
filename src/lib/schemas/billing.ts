import { billingConfig } from '$lib/config/billing';
import { z } from 'zod';

export const creditPurchaseSchema = z.object({
	amount: z
		.number()
		.int()
		.min(
			billingConfig.minCreditPurchase,
			`Minimum purchase is ${billingConfig.minCreditPurchase} credits`
		)
});

export type CreditPurchaseInput = z.infer<typeof creditPurchaseSchema>;
