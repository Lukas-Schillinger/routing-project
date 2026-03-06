<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import RequestMagicLogin from '../../routes/(app)/auth/login/RequestMagicLogin.svelte';

	const { Story } = defineMeta({
		title: 'Auth/RequestMagicLogin',
		component: RequestMagicLogin,
		args: {
			onBack: () => {}
		}
	});
</script>

<Story name="Email Entry" />

<Story
	name="Email Entry Error"
	args={{ debugError: 'Error sending login code. Please try again.' }}
/>

<Story
	name="OTP Entry"
	args={{ debugOtpSent: true, debugEmail: 'user@example.com' }}
/>

<Story
	name="OTP Entry Success"
	args={{
		debugOtpSent: true,
		debugEmail: 'user@example.com',
		debugSuccess: 'Check your inbox for a login code'
	}}
/>

<Story
	name="OTP Entry Error"
	args={{
		debugOtpSent: true,
		debugEmail: 'user@example.com',
		debugError: 'Invalid or expired code. Please try again.'
	}}
/>
