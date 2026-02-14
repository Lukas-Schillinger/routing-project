import { describe, expect, it } from 'vitest';
import { creditPurchaseSchema } from './billing';

/**
 * Billing Schema Tests
 *
 * Tests validation for billing-related input schemas.
 */

describe('creditPurchaseSchema', () => {
	it('accepts valid credit purchase with returnUrl', () => {
		const result = creditPurchaseSchema.safeParse({
			amount: 500,
			returnUrl: '/maps/123'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.amount).toBe(500);
			expect(result.data.returnUrl).toBe('/maps/123');
		}
	});

	it('accepts credit purchase without returnUrl', () => {
		const result = creditPurchaseSchema.safeParse({
			amount: 500
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.returnUrl).toBeUndefined();
		}
	});

	it('rejects amount below minimum', () => {
		const result = creditPurchaseSchema.safeParse({
			amount: 50
		});
		expect(result.success).toBe(false);
	});

	it('rejects non-integer amount', () => {
		const result = creditPurchaseSchema.safeParse({
			amount: 100.5
		});
		expect(result.success).toBe(false);
	});

	it('rejects absolute URL in returnUrl', () => {
		const result = creditPurchaseSchema.safeParse({
			amount: 500,
			returnUrl: 'https://evil.com/phish'
		});
		expect(result.success).toBe(false);
	});

	it('rejects relative URL without leading slash', () => {
		const result = creditPurchaseSchema.safeParse({
			amount: 500,
			returnUrl: 'maps/123'
		});
		expect(result.success).toBe(false);
	});
});
