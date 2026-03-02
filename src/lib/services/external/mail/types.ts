// ============================================================================
// Login Link
// ============================================================================
export type MagicLinkData = {
	token: string;
	login_url: string;
};

type MagicLinkRequest = {
	template_id: 'magic_link';
	props: MagicLinkData;
};

// ============================================================================
// Invitation
// ============================================================================
export type MagicInviteData = {
	invite_url: string;
	inviter_name?: string | null;
	inviter_email: string;
	organization_name: string;
};

type MagicInviteRequest = {
	template_id: 'magic_invite';
	props: MagicInviteData;
};

// ============================================================================
// Route Share
// ============================================================================
export type RouteShareData = {
	route_url: string;
	route_title: string;
	driver_name: string;
};

type RouteShareRequest = {
	template_id: 'route_share';
	props: RouteShareData;
};

// ============================================================================
// Password Reset
// ============================================================================
export type PasswordResetData = {
	login_url: string;
};

type PasswordResetRequest = {
	template_id: 'password_reset';
	props: PasswordResetData;
};

// ============================================================================
// Confirm Email
// ============================================================================
type ConfirmEmailRequest = {
	template_id: 'confirm_email';
	props: MagicLinkData;
};

// ============================================================================
// Billing Notification
// ============================================================================
export type BillingNotificationData = {
	type: 'payment_failed' | 'payment_action_required';
	hosted_invoice_url?: string;
};

type BillingNotificationRequest = {
	template_id: 'billing_notification';
	props: BillingNotificationData;
};

// ============================================================================
// Render Request Types
// ============================================================================
export type RenderRequest =
	| MagicLinkRequest
	| MagicInviteRequest
	| RouteShareRequest
	| ConfirmEmailRequest
	| PasswordResetRequest
	| BillingNotificationRequest;

// ============================================================================
// Render Response Types
// ============================================================================
type RenderResponseSuccess = {
	success: true;
	results: {
		html: string;
		text: string;
	};
};

type RenderResponseFail = {
	success: false;
	error?: object | string;
};

export type RenderResponse = RenderResponseSuccess | RenderResponseFail;

export type RenderedEmail = {
	html: string;
	text: string;
};
