<script lang="ts">
	import { resolve } from '$app/paths';
	import { AuthAlert, AuthCard } from '$lib/components/auth';
	import { Button } from '$lib/components/ui/button';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { resetPasswordSchema } from '$lib/schemas';
	import { Loader2, Lock } from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';

	let { data } = $props();
	const form = superForm(data.form, {
		validators: zod4Client(resetPasswordSchema)
	});
	const { form: formData, enhance, submitting, message } = form;
</script>

<svelte:head>
	<title>Wend | Reset password</title>
</svelte:head>

<AuthCard title="Set new password" description="Enter your new password">
	{#if $message}
		<div class="pb-4">
			<AuthAlert message={$message} />
		</div>
	{/if}

	<form method="post" action="?/reset" use:enhance class="space-y-5" novalidate>
		<input type="hidden" name="email" value={$formData.email} />
		<input type="hidden" name="token" value={$formData.token} />

		<Form.Field {form} name="newPassword">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label
						class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
					>
						New password
					</Form.Label>
					<div class="relative">
						<Lock
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
						/>
						<Input
							{...props}
							type="password"
							bind:value={$formData.newPassword}
							placeholder="Enter your new password…"
							class="h-11 border-border/50 bg-background/50 pl-10 transition-colors focus:border-primary/50 focus:bg-background"
							disabled={$submitting}
						/>
					</div>
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<div class="pt-2">
			<Button
				type="submit"
				class="h-11 w-full font-medium"
				disabled={$submitting}
			>
				{#if $submitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Resetting password...
				{:else}
					Reset password
				{/if}
			</Button>
		</div>
	</form>

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
