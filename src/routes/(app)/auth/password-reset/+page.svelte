<script lang="ts">
	import { resolve } from '$app/paths';
	import { AuthCard } from '$lib/components/auth';
	import { Button } from '$lib/components/ui/button';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { requestPasswordResetSchema } from '$lib/schemas';
	import { CheckCircle, Loader2, Mail } from 'lucide-svelte';
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';

	let { data } = $props();
	const form = superForm(
		untrack(() => data.form),
		{
			validators: zod4Client(requestPasswordResetSchema)
		}
	);
	const { form: formData, enhance, submitting, message } = form;

	const isSuccess = $derived(
		$message && typeof $message === 'object' && $message.status === 'success'
	);
	const successEmail = $derived(
		$message && typeof $message === 'object' && 'email' in $message
			? ($message.email as string)
			: ''
	);
</script>

<svelte:head>
	<title>Wend | Reset password</title>
</svelte:head>

<AuthCard
	title="Reset password"
	description="Enter your email to receive a reset link"
>
	{#if isSuccess}
		<div class="flex flex-col items-center gap-4 py-4 text-center">
			<div
				class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"
			>
				<CheckCircle class="h-6 w-6 text-primary" />
			</div>
			<div class="space-y-2">
				<p class="font-medium text-foreground">Check your email</p>
				<p class="text-sm text-muted-foreground">
					We've sent a password reset link to <span class="font-medium"
						>{successEmail}</span
					>
				</p>
			</div>
			<Button
				variant="ghost"
				href={resolve('/auth/login')}
				size="lg"
				class="mt-2 text-muted-foreground hover:text-foreground"
			>
				Back to login
			</Button>
		</div>
	{:else}
		<form
			method="post"
			action="?/requestReset"
			use:enhance
			class="space-y-5"
			novalidate
		>
			<Form.Field {form} name="email">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label
							class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>
							Email address
						</Form.Label>
						<div class="relative">
							<Mail
								class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
							/>
							<Input
								{...props}
								type="email"
								bind:value={$formData.email}
								placeholder="you@example.com"
								class="h-11 border-border/50 bg-background/50 pl-10 transition-colors focus:border-primary/50 focus:bg-background"
								disabled={$submitting}
							/>
						</div>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<div class="flex flex-col gap-3 pt-2">
				<Button type="submit" size="lg" class="w-full" disabled={$submitting}>
					{#if $submitting}
						<Loader2 class="h-4 w-4 animate-spin" />
						Sending...
					{:else}
						Send reset link
					{/if}
				</Button>

				<Button
					variant="ghost"
					href={resolve('/auth/login')}
					size="lg"
					class="w-full text-muted-foreground hover:text-foreground"
					disabled={$submitting}
				>
					Back to login
				</Button>
			</div>
		</form>
	{/if}
</AuthCard>
