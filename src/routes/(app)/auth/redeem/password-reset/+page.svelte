<script lang="ts">
	import { resolve } from '$app/paths';
	import { AuthCard } from '$lib/components/auth';
	import { Button } from '$lib/components/ui/button';
	import ResetPasswordForm from './ResetPasswordForm.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Wend | Reset password</title>
</svelte:head>

<AuthCard title="Set new password" description="Enter your new password">
	<ResetPasswordForm resetForm={data.form} />

	{#snippet footer()}
		<p class="text-sm text-muted-foreground">
			Remember your password?
			<Button
				variant="link"
				href={resolve('/auth/login')}
				class="h-auto p-0 pl-1 text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
			>
				Sign in
			</Button>
		</p>
	{/snippet}
</AuthCard>
