<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LoginWithPassword from '../../routes/(app)/auth/login/LoginWithPassword.svelte';
	import { defaults } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { loginSchema } from '$lib/schemas/auth';

	const loginForm = defaults({ email: '', password: '' }, zod4(loginSchema));

	const { Story } = defineMeta({
		title: 'Auth/LoginWithPassword',
		component: LoginWithPassword,
		args: {
			loginForm,
			onRequestMagicLogin: () => {}
		}
	});
</script>

<Story name="Default" />

<Story name="Error" args={{ debugMessage: 'Invalid email or password.' }} />

<Story
	name="Unconfirmed Email"
	args={{
		debugMessage: 'Please confirm your email address before signing in.'
	}}
/>
