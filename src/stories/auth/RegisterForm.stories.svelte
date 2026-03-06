<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import RegisterForm from '../../routes/(app)/auth/register/RegisterForm.svelte';
	import { defaults } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { registerSchema } from '$lib/schemas/auth';

	const registerForm = defaults(
		{ email: '', password: '' },
		zod4(registerSchema)
	);

	const { Story } = defineMeta({
		title: 'Auth/RegisterForm',
		component: RegisterForm,
		args: {
			registerForm
		}
	});
</script>

<Story name="Default" />

<Story
	name="Error"
	args={{ debugMessage: 'A user with this email already exists.' }}
/>
