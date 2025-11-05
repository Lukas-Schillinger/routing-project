// Resend exports
export { ResendClient, resendClient } from './resend.js';
export type {
	ResendError,
	SendEmailRequest as ResendSendEmailRequest,
	SendEmailResponse as ResendSendEmailResponse,
	SendTemplateEmailRequest
} from './resend.js';

// Mailgun exports
export { MailgunClient, mailgunClient } from './mailgun.js';
export type {
	MailgunError,
	SendEmailRequest as MailgunSendEmailRequest,
	SendEmailResponse as MailgunSendEmailResponse,
	SendTemplateEmailRequest as MailgunSendTemplateEmailRequest
} from './mailgun.js';
