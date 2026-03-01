<script lang="ts">
	import { enhance as nativeEnhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { AuthAlert } from '$lib/components/auth';
	import { Button } from '$lib/components/ui/button';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { loginSchema } from '$lib/schemas/auth';
	import { ArrowLeft, Loader2, Lock, Mail } from 'lucide-svelte';
	import { untrack } from 'svelte';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';

	let {
		loginForm: loginFormData,
		onRequestMagicLogin,
		debugMessage = undefined
	}: {
		loginForm: SuperValidated<Infer<typeof loginSchema>>;
		onRequestMagicLogin: () => void;
		debugMessage?: string | null;
	} = $props();

	const form = superForm(
		untrack(() => loginFormData),
		{
			validators: zod4Client(loginSchema)
		}
	);
	const { form: formData, enhance, submitting, message } = form;

	// Parse $message: either a typed object { text, code, email } or a plain string
	const parsed = $derived.by(() => {
		if (debugMessage) return { text: debugMessage, unconfirmedEmail: null };
		if (!$message) return null;
		if (typeof $message === 'object' && 'code' in $message) {
			const msg = $message as { text: string; code: string; email: string };
			return {
				text: msg.text,
				unconfirmedEmail: msg.code === 'EMAIL_NOT_CONFIRMED' ? msg.email : null
			};
		}
		return { text: $message as string, unconfirmedEmail: null };
	});

	let isResending = $state(false);
	let resendSuccess = $state(false);
</script>

{#if parsed}
	<div class="space-y-3 pb-4">
		<AuthAlert message={parsed.text} />
		{#if parsed.unconfirmedEmail}
			<form
				method="post"
				action="?/resendConfirmation"
				use:nativeEnhance={() => {
					isResending = true;
					return async ({ update }) => {
						await update();
						isResending = false;
						resendSuccess = true;
					};
				}}
			>
				<input type="hidden" name="email" value={parsed.unconfirmedEmail} />
				<Button
					type="submit"
					variant="outline"
					size="sm"
					class="w-full"
					disabled={isResending}
				>
					{#if isResending}
						<Loader2 class="h-4 w-4 animate-spin" />
						Sending...
					{:else}
						Resend confirmation email
					{/if}
				</Button>
			</form>
		{/if}
	</div>
{/if}

{#if resendSuccess}
	<div class="pb-4">
		<AuthAlert
			message="Confirmation email sent! Check your inbox."
			variant="success"
		/>
	</div>
{/if}

<form method="post" action="?/login" use:enhance class="space-y-5" novalidate>
	<Form.Field {form} name="email">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label
					class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
				>
					Email
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

	<Form.Field {form} name="password">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label
					class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
				>
					Password
				</Form.Label>
				<div class="relative">
					<Lock
						class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
					/>
					<Input
						{...props}
						type="password"
						bind:value={$formData.password}
						placeholder="Enter your password…"
						class="h-11 border-border/50 bg-background/50 pl-10 transition-colors focus:border-primary/50 focus:bg-background"
						disabled={$submitting}
					/>
				</div>
			{/snippet}
		</Form.Control>
		<div class="text-xs text-muted-foreground">
			<!-- eslint-disable svelte/no-navigation-without-resolve -- resolve() is used; rule can't parse template concatenation on <a> -->
			<a
				href={`${resolve('/auth/password-reset')}?email=${encodeURIComponent($formData.email)}`}
				class="transition-colors hover:text-foreground"
			>
				Reset password
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</div>
		<Form.FieldErrors />
	</Form.Field>

	<div class="flex flex-col gap-3 pt-2">
		<Button
			type="submit"
			class="h-11 w-full font-medium"
			disabled={$submitting}
		>
			{#if $submitting}
				<Loader2 class="h-4 w-4 animate-spin" />
				Signing in...
			{:else}
				Sign in
			{/if}
		</Button>

		<div class="relative">
			<div class="absolute inset-0 flex items-center">
				<span class="w-full border-t border-border/30"></span>
			</div>
			<div class="relative flex justify-center text-xs">
				<span class="bg-card px-3 text-muted-foreground/60">or</span>
			</div>
		</div>

		<Button
			variant="ghost"
			type="button"
			class="h-10 w-full text-muted-foreground hover:text-foreground"
			onclick={onRequestMagicLogin}
			disabled={$submitting}
		>
			<ArrowLeft class="h-4 w-4" />
			Back to email
		</Button>
	</div>
</form>
