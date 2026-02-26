<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { AuthAlert, AuthCard } from '$lib/components/auth';
	import DebugToolbar from '$lib/components/DebugToolbar.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { ActionData } from './$types';
	import LoginWithPassword from './LoginWithPassword.svelte';
	import RequestMagicLogin from './RequestMagicLogin.svelte';

	let { form }: { form: ActionData } = $props();

	// Registration flow: ?confirm=true&email=... (shows OTP entry with confirmation message)
	// Normal login: no params (shows password login)
	const isRegistrationFlow = $derived(
		$page.url.searchParams.get('confirm') === 'true'
	);
	const emailParam = $derived($page.url.searchParams.get('email') ?? '');

	// Default to magic login - passwords are optional so email login is primary
	let userLoginMethod = $state<'password' | 'magic'>('magic');

	// Debug state
	type LoginState = 'password' | 'magic-email' | 'magic-otp';
	let debugState = $state<LoginState | null>(null);
	let debugShowError = $state(false);
	let debugShowSuccess = $state(false);

	// Derive active login method from debug state or user selection
	const loginMethod = $derived.by(() => {
		if (debugState === 'password') return 'password';
		if (debugState === 'magic-email' || debugState === 'magic-otp')
			return 'magic';
		return userLoginMethod;
	});

	const description = $derived(
		loginMethod === 'password'
			? 'Sign in to continue to your routes'
			: "We'll send a secure link to your email"
	);

	// Derived debug props
	const debugError = $derived(
		debugShowError ? 'Invalid email or password. Please try again.' : null
	);
	const debugMagicError = $derived(
		debugShowError ? 'Error sending login code. Please try again.' : null
	);
	const debugSuccess = $derived(
		debugShowSuccess ? 'Check your inbox for a login code' : null
	);
	const debugOtpSent = $derived(debugState === 'magic-otp');
	const debugFormMessage = $derived(
		debugState === 'password' && debugShowError ? debugError : null
	);
</script>

<svelte:head>
	<title>Wend | Sign in</title>
</svelte:head>

<AuthCard title="Welcome back" {description}>
	{#if isRegistrationFlow}
		<div class="pb-4">
			<AuthAlert
				message="Check your email for a confirmation code to complete registration."
				variant="info"
			/>
		</div>
	{/if}

	{#if loginMethod === 'password'}
		<LoginWithPassword
			form={debugFormMessage ? { message: debugFormMessage } : form}
			onRequestMagicLogin={() => (userLoginMethod = 'magic')}
		/>
	{:else}
		<RequestMagicLogin
			onBack={() => (userLoginMethod = 'password')}
			debugOtpSent={debugState ? debugOtpSent : undefined}
			debugError={debugState && debugShowError ? debugMagicError : undefined}
			debugSuccess={debugState === 'magic-otp' && debugShowSuccess
				? debugSuccess
				: undefined}
			debugEmail={debugState ? 'user@example.com' : emailParam || undefined}
			initialEmail={emailParam}
			initialOtpSent={isRegistrationFlow}
		/>
	{/if}

	{#snippet footer()}
		<p class="text-sm text-muted-foreground">
			Don't have an account?
			<Button
				variant="link"
				href={resolve('/auth/register')}
				class="h-auto p-0 pl-1 text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
			>
				Create one
			</Button>
		</p>
	{/snippet}
</AuthCard>

<DebugToolbar title="Login States">
	<div class="flex flex-col gap-3">
		<div class="flex flex-col gap-1.5">
			<span class="text-xs font-medium text-muted-foreground">View</span>
			<div class="flex flex-wrap gap-1">
				{#each [{ value: 'password', label: 'Password' }, { value: 'magic-email', label: 'Magic Email' }, { value: 'magic-otp', label: 'OTP Entry' }] as { value, label } (value)}
					{@const isActive = debugState === value}
					<Button
						variant={isActive ? 'default' : 'outline'}
						size="sm"
						class="h-7 text-xs"
						onclick={() => (debugState = value as LoginState)}
					>
						{label}
					</Button>
				{/each}
			</div>
		</div>

		<div class="flex flex-col gap-1.5">
			<span class="text-xs font-medium text-muted-foreground">Alerts</span>
			<div class="flex gap-1">
				<Button
					variant={debugShowError ? 'destructive' : 'outline'}
					size="sm"
					class="h-7 flex-1 text-xs"
					onclick={() => {
						debugShowError = !debugShowError;
						if (debugShowError) debugShowSuccess = false;
					}}
				>
					Error
				</Button>
				<Button
					variant={debugShowSuccess ? 'default' : 'outline'}
					size="sm"
					class="h-7 flex-1 text-xs"
					onclick={() => {
						debugShowSuccess = !debugShowSuccess;
						if (debugShowSuccess) debugShowError = false;
					}}
				>
					Success
				</Button>
			</div>
		</div>

		{#if debugState}
			<div class="border-t border-border pt-2">
				<Button
					variant="ghost"
					size="sm"
					class="h-6 w-full text-xs text-muted-foreground"
					onclick={() => {
						debugState = null;
						debugShowError = false;
						debugShowSuccess = false;
					}}
				>
					Reset to auto
				</Button>
			</div>
		{/if}
	</div>
</DebugToolbar>
