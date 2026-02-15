import type { Invitation, LoginToken } from '$lib/schemas/auth';
import type { Organization } from '$lib/schemas/organization';
import type { RouteShare } from '$lib/schemas/route-share';
import type { PublicUser } from '$lib/schemas/user';
import { createMockRenderClient, createMockResend } from '$lib/testing/mocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MailService } from './mail.service';

// Mock the env module
vi.mock('$env/dynamic/private', () => ({
	env: {
		RESEND_API_KEY: 'test-api-key',
		EMAIL_FROM: 'noreply@test.wend.app'
	}
}));

// Mock logger to avoid env dependency
vi.mock('$lib/server/logger', () => ({
	logger: { child: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
}));

// Mock services that MailService calls to link mail records
const mockMailRecordService = vi.hoisted(() => ({
	createMailRecord: vi.fn()
}));
const mockInvitationService = vi.hoisted(() => ({
	setMailRecordId: vi.fn()
}));
const mockLoginTokenService = vi.hoisted(() => ({
	setMailRecordId: vi.fn()
}));
const mockRouteShareService = vi.hoisted(() => ({
	setMailRecordId: vi.fn()
}));

vi.mock('$lib/services/server/mail-record.service', () => ({
	mailRecordService: mockMailRecordService
}));
vi.mock('$lib/services/server/invitation.service', () => ({
	invitationService: mockInvitationService
}));
vi.mock('$lib/services/server/login-token.service', () => ({
	loginTokenService: mockLoginTokenService
}));
vi.mock('$lib/services/server/route-share.service', () => ({
	routeShareService: mockRouteShareService
}));

// ============================================================================
// Test data builders (inline to avoid $lib/testing DB dependency chain)
// ============================================================================

function buildLoginToken(overrides?: Partial<LoginToken>): LoginToken {
	return {
		id: 'lt-1',
		organization_id: 'org-1',
		user_id: 'user-1',
		token_hash: 'hash-abc',
		type: 'login_token',
		expires_at: new Date(Date.now() + 15 * 60 * 1000),
		created_at: new Date(),
		mail_record_id: null,
		...overrides
	};
}

function buildInvitation(overrides?: Partial<Invitation>): Invitation {
	return {
		id: 'inv-1',
		organization_id: 'org-1',
		email: 'invitee@example.com',
		role: 'member',
		token_hash: 'hash-xyz',
		expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		created_at: new Date(),
		created_by: 'user-1',
		updated_at: new Date(),
		updated_by: null,
		used_at: null,
		mail_record_id: null,
		...overrides
	};
}

function buildRouteShare(overrides?: Partial<RouteShare>): RouteShare {
	return {
		id: 'share-1',
		organization_id: 'org-1',
		route_id: 'route-1',
		share_type: 'email',
		access_token_hash: 'hash-share',
		expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		created_at: new Date(),
		created_by: 'user-1',
		updated_at: new Date(),
		revoked_at: null,
		mail_record_id: null,
		...overrides
	};
}

describe('MailService', () => {
	let mockResend: ReturnType<typeof createMockResend>;
	let mockRenderer: ReturnType<typeof createMockRenderClient>;
	let service: MailService;

	beforeEach(() => {
		vi.clearAllMocks();

		mockResend = createMockResend();
		mockRenderer = createMockRenderClient();
		service = new MailService({
			emailSender: mockResend,
			renderer: mockRenderer
		});

		// Default: mailRecordService.createMailRecord returns a record with an id
		mockMailRecordService.createMailRecord.mockResolvedValue({
			id: 'mail-record-123'
		});
	});

	// ============================================================================
	// sendLoginEmail
	// ============================================================================
	describe('sendLoginEmail()', () => {
		const loginToken = buildLoginToken();
		const email = 'user@example.com';
		const token = 'raw-token-abc';
		const origin = 'https://app.wend.test';

		it('renders magic link template and sends email', async () => {
			await service.sendLoginEmail(loginToken, email, token, origin);

			expect(mockRenderer.renderMagicLink).toHaveBeenCalledWith({
				login_url: `${origin}/auth/redeem/login-token?token=${token}&email=${encodeURIComponent(email)}`,
				token
			});
			expect(mockResend.emails.send).toHaveBeenCalledWith(
				expect.objectContaining({
					to: email,
					subject: 'Wend login link'
				})
			);
		});

		it('creates mail record with type login_token', async () => {
			await service.sendLoginEmail(loginToken, email, token, origin);

			expect(mockMailRecordService.createMailRecord).toHaveBeenCalledWith(
				expect.objectContaining({
					organization_id: 'org-1',
					type: 'login_token',
					to_email: email
				})
			);
		});

		it('links mail record to login token', async () => {
			await service.sendLoginEmail(loginToken, email, token, origin);

			expect(mockLoginTokenService.setMailRecordId).toHaveBeenCalledWith(
				'lt-1',
				'mail-record-123'
			);
		});

		it('uses confirm email template and different subject for welcome variant', async () => {
			await service.sendLoginEmail(loginToken, email, token, origin, true);

			expect(mockRenderer.renderConfirmEmail).toHaveBeenCalled();
			expect(mockRenderer.renderMagicLink).not.toHaveBeenCalled();
			expect(mockResend.emails.send).toHaveBeenCalledWith(
				expect.objectContaining({
					subject: 'Wend email confirmation'
				})
			);
		});

		it('URL-encodes email in login URL', async () => {
			const specialEmail = 'user+tag@example.com';
			await service.sendLoginEmail(loginToken, specialEmail, token, origin);

			expect(mockRenderer.renderMagicLink).toHaveBeenCalledWith(
				expect.objectContaining({
					login_url: expect.stringContaining('user%2Btag%40example.com')
				})
			);
		});
	});

	// ============================================================================
	// sendInvitationEmail
	// ============================================================================
	describe('sendInvitationEmail()', () => {
		const invitation = buildInvitation();
		const inviter = { name: 'Alice', email: 'alice@example.com' } as PublicUser;
		const organization = { name: 'Acme Corp' } as Organization;
		const token = 'invite-token-xyz';
		const origin = 'https://app.wend.test';

		it('renders invite template with inviter/org data', async () => {
			await service.sendInvitationEmail(
				invitation,
				token,
				inviter,
				organization,
				origin
			);

			expect(mockRenderer.renderMagicInvite).toHaveBeenCalledWith({
				invite_url: expect.stringContaining(
					'/auth/redeem/invitation?token=invite-token-xyz'
				),
				inviter_name: 'Alice',
				inviter_email: 'alice@example.com',
				organization_name: 'Acme Corp'
			});
		});

		it('sends with subject "Welcome to Wend!"', async () => {
			await service.sendInvitationEmail(
				invitation,
				token,
				inviter,
				organization,
				origin
			);

			expect(mockResend.emails.send).toHaveBeenCalledWith(
				expect.objectContaining({
					to: 'invitee@example.com',
					subject: 'Welcome to Wend!'
				})
			);
		});

		it('creates mail record with type invitation', async () => {
			await service.sendInvitationEmail(
				invitation,
				token,
				inviter,
				organization,
				origin
			);

			expect(mockMailRecordService.createMailRecord).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'invitation',
					to_email: 'invitee@example.com'
				})
			);
		});

		it('links mail record to invitation', async () => {
			await service.sendInvitationEmail(
				invitation,
				token,
				inviter,
				organization,
				origin
			);

			expect(mockInvitationService.setMailRecordId).toHaveBeenCalledWith(
				'inv-1',
				'mail-record-123'
			);
		});

		it('throws when created_by is null', async () => {
			const noCreator = buildInvitation({ created_by: null });

			await expect(
				service.sendInvitationEmail(
					noCreator,
					token,
					inviter,
					organization,
					origin
				)
			).rejects.toMatchObject({
				code: 'INTERNAL_ERROR',
				message: expect.stringContaining('created_by')
			});
		});
	});

	// ============================================================================
	// sendRouteShareEmail
	// ============================================================================
	describe('sendRouteShareEmail()', () => {
		const share = buildRouteShare();
		const recipientEmail = 'recipient@example.com';
		const token = 'share-token-abc';
		const routeTitle = 'Morning Deliveries';
		const driverName = 'Bob';
		const origin = 'https://app.wend.test';

		it('renders route share template', async () => {
			await service.sendRouteShareEmail(
				share,
				recipientEmail,
				token,
				routeTitle,
				driverName,
				origin
			);

			expect(mockRenderer.renderRouteShare).toHaveBeenCalledWith({
				route_url: `${origin}/routes/route-1?token=${token}`,
				route_title: routeTitle,
				driver_name: driverName
			});
		});

		it('sends with subject "Route shared: {title}"', async () => {
			await service.sendRouteShareEmail(
				share,
				recipientEmail,
				token,
				routeTitle,
				driverName,
				origin
			);

			expect(mockResend.emails.send).toHaveBeenCalledWith(
				expect.objectContaining({
					to: recipientEmail,
					subject: 'Route shared: Morning Deliveries'
				})
			);
		});

		it('creates mail record with type route_share', async () => {
			await service.sendRouteShareEmail(
				share,
				recipientEmail,
				token,
				routeTitle,
				driverName,
				origin
			);

			expect(mockMailRecordService.createMailRecord).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'route_share',
					to_email: recipientEmail
				})
			);
		});

		it('links mail record to route share', async () => {
			await service.sendRouteShareEmail(
				share,
				recipientEmail,
				token,
				routeTitle,
				driverName,
				origin
			);

			expect(mockRouteShareService.setMailRecordId).toHaveBeenCalledWith(
				'share-1',
				'mail-record-123'
			);
		});
	});

	// ============================================================================
	// sendPasswordResetEmail
	// ============================================================================
	describe('sendPasswordResetEmail()', () => {
		const loginToken = buildLoginToken({ id: 'lt-2', type: 'password_reset' });
		const email = 'user@example.com';
		const token = 'reset-token-xyz';
		const origin = 'https://app.wend.test';

		it('renders password reset template', async () => {
			await service.sendPasswordResetEmail(loginToken, email, token, origin);

			expect(mockRenderer.renderPasswordReset).toHaveBeenCalledWith({
				login_url: `${origin}/auth/redeem/password-reset?token=${token}&email=${encodeURIComponent(email)}`
			});
		});

		it('sends with correct subject', async () => {
			await service.sendPasswordResetEmail(loginToken, email, token, origin);

			expect(mockResend.emails.send).toHaveBeenCalledWith(
				expect.objectContaining({
					to: email,
					subject: 'Reset your Wend password'
				})
			);
		});

		it('creates mail record with type password_reset', async () => {
			await service.sendPasswordResetEmail(loginToken, email, token, origin);

			expect(mockMailRecordService.createMailRecord).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'password_reset',
					to_email: email
				})
			);
		});

		it('links mail record to login token', async () => {
			await service.sendPasswordResetEmail(loginToken, email, token, origin);

			expect(mockLoginTokenService.setMailRecordId).toHaveBeenCalledWith(
				'lt-2',
				'mail-record-123'
			);
		});
	});

	// ============================================================================
	// Error handling
	// ============================================================================
	describe('error handling', () => {
		const loginToken = buildLoginToken({ id: 'lt-err' });

		it('throws ServiceError.internal when Resend SDK returns error', async () => {
			mockResend.emails.send.mockResolvedValue({
				data: null,
				error: { message: 'Rate limit exceeded' }
			});

			await expect(
				service.sendLoginEmail(
					loginToken,
					'user@example.com',
					'tok',
					'https://app.test'
				)
			).rejects.toMatchObject({
				code: 'INTERNAL_ERROR',
				message: 'Rate limit exceeded'
			});
		});

		it('throws ServiceError.internal when Resend returns no ID', async () => {
			mockResend.emails.send.mockResolvedValue({
				data: null,
				error: null
			});

			await expect(
				service.sendLoginEmail(
					loginToken,
					'user@example.com',
					'tok',
					'https://app.test'
				)
			).rejects.toMatchObject({
				code: 'INTERNAL_ERROR',
				message: 'Resend did not return an email ID'
			});
		});
	});
});
