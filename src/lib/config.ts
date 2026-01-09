// Session configuration
export const SESSION = {
	DURATION_DAYS: 30,
	RENEWAL_THRESHOLD_DAYS: 15
} as const;

// Token expiration (in hours)
export const TOKEN_EXPIRY = {
	OTP_HOURS: 0.25, // 15 minutes
	EMAIL_CONFIRMATION_HOURS: 24,
	INVITATION_HOURS: 720, // 30 days
	SHARE_HOURS: 720 // 30 days
} as const;

// File upload limits
export const FILE_LIMITS = {
	MAX_SIZE_BYTES: 10 * 1024 * 1024 // 10 MB
} as const;
