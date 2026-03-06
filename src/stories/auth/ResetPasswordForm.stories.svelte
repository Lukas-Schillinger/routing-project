<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ResetPasswordForm from '../../routes/(app)/auth/redeem/password-reset/ResetPasswordForm.svelte';
	import { defaults } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { resetPasswordSchema } from '$lib/schemas';

	const resetForm = defaults(
		{ email: 'user@example.com', token: 'mock-token', newPassword: '' },
		zod4(resetPasswordSchema)
	);

	const { Story } = defineMeta({
		title: 'Auth/ResetPasswordForm',
		component: ResetPasswordForm,
		args: {
			resetForm
		}
	});
</script>

<Story name="Default" />

<Story
	name="Error"
	args={{
		debugMessage: 'This reset link has expired. Please request a new one.'
	}}
/>
