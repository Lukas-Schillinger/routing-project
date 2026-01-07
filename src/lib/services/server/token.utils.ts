import { sha256 } from '@oslojs/crypto/sha2';
import { encodeHexLowerCase } from '@oslojs/encoding';
import { randomBytes, randomInt } from 'crypto';

export const TokenUtils = {
	// ============================================================================
	// Hashing
	// ============================================================================

	hash(raw: string): string {
		return encodeHexLowerCase(sha256(new TextEncoder().encode(raw)));
	},

	// ============================================================================
	// Generation
	// ============================================================================

	generateOTP(length = 6): string {
		return Array.from({ length }, () => randomInt(0, 10)).join('');
	},

	generateHex(bytes = 32): string {
		return randomBytes(bytes).toString('hex');
	},

	// ============================================================================
	// Expiration
	// ============================================================================

	getExpiry(hours: number): Date {
		return new Date(Date.now() + hours * 60 * 60 * 1000);
	},

	isExpired(date: Date): boolean {
		return Date.now() >= date.getTime();
	}
};
