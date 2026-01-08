import { describe, expect, it } from 'vitest';
import { TokenUtils } from './token.utils';

describe('TokenUtils', () => {
	describe('hash()', () => {
		it('produces consistent SHA256 hex output', () => {
			expect.assertions(3);
			const result = TokenUtils.hash('test-input');

			// Should be 64 hex characters (256 bits)
			expect(result).toMatch(/^[a-f0-9]{64}$/);

			// Should be consistent (same input = same output)
			expect(TokenUtils.hash('test-input')).toBe(result);

			// Different input should produce different output
			expect(TokenUtils.hash('different-input')).not.toBe(result);
		});
	});

	describe('generateOTP()', () => {
		it('returns 6-digit numeric string by default', () => {
			expect.assertions(1);
			const otp = TokenUtils.generateOTP();
			expect(otp).toMatch(/^\d{6}$/);
		});

		it('returns custom length numeric string', () => {
			expect.assertions(2);
			const otp8 = TokenUtils.generateOTP(8);
			expect(otp8).toMatch(/^\d{8}$/);

			const otp4 = TokenUtils.generateOTP(4);
			expect(otp4).toMatch(/^\d{4}$/);
		});
	});

	describe('generateHex()', () => {
		it('returns correct byte length as hex', () => {
			expect.assertions(1);
			const hex = TokenUtils.generateHex(16);
			// 16 bytes = 32 hex characters
			expect(hex).toMatch(/^[a-f0-9]{32}$/);
		});

		it('defaults to 32 bytes (64 hex chars)', () => {
			expect.assertions(1);
			const hex = TokenUtils.generateHex();
			expect(hex).toMatch(/^[a-f0-9]{64}$/);
		});
	});

	describe('getExpiry()', () => {
		it('calculates future date correctly', () => {
			expect.assertions(2);
			const before = Date.now();
			const expiry = TokenUtils.getExpiry(24); // 24 hours
			const after = Date.now();

			const expectedMs = 24 * 60 * 60 * 1000;
			expect(expiry.getTime()).toBeGreaterThanOrEqual(before + expectedMs);
			expect(expiry.getTime()).toBeLessThanOrEqual(after + expectedMs);
		});
	});

	describe('isExpired()', () => {
		it('returns true for past dates', () => {
			expect.assertions(1);
			const pastDate = new Date(Date.now() - 1000);
			expect(TokenUtils.isExpired(pastDate)).toBe(true);
		});

		it('returns false for future dates', () => {
			expect.assertions(1);
			const futureDate = new Date(Date.now() + 60000);
			expect(TokenUtils.isExpired(futureDate)).toBe(false);
		});
	});
});
