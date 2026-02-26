<!--
	No superforms here. The request-OTP and verify-OTP forms share an email
	value and are simple enough (one field each) that superforms' store-based
	approach adds indirection without benefit. Plain $state + native enhance
	keeps the data flow obvious.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { AuthAlert } from '$lib/components/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as InputOTP from '$lib/components/ui/input-otp';
	import { Label } from '$lib/components/ui/label';
	import {
		ArrowLeft,
		ArrowRight,
		Loader2,
		Mail,
		Sparkles
	} from 'lucide-svelte';

	interface Props {
		onBack: () => void;
		debugOtpSent?: boolean;
		debugError?: string | null;
		debugSuccess?: string | null;
		debugEmail?: string;
		initialEmail?: string;
		initialOtpSent?: boolean;
	}

	let {
		onBack,
		debugOtpSent,
		debugError,
		debugSuccess,
		debugEmail,
		initialEmail = '',
		initialOtpSent = false
	}: Props = $props();

	let email = $state(initialEmail);
	let code = $state('');
	let internalOtpSent = $state(initialOtpSent);
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);
	let otpFormRef: HTMLFormElement | undefined = $state();

	const otpSent = $derived(debugOtpSent ?? internalOtpSent);
	const displayEmail = $derived(debugEmail ?? email);
	const displayError = $derived(debugError ?? errorMessage);
	const displaySuccess = $derived(debugSuccess ?? successMessage);

	function handleBack() {
		if (otpSent) {
			internalOtpSent = false;
			code = '';
			errorMessage = null;
			successMessage = null;
		} else {
			onBack();
		}
	}
</script>

{#if !otpSent}
	<form
		method="post"
		action="?/requestOTP"
		use:enhance={() => {
			isSubmitting = true;
			errorMessage = null;
			return async ({ result, update }) => {
				isSubmitting = false;
				if (result.type === 'failure') {
					errorMessage =
						(result.data as { otpError?: string })?.otpError ??
						'Error sending login code';
				} else if (result.type === 'success') {
					successMessage = 'Check your inbox for a login code';
					internalOtpSent = true;
				} else {
					await update();
				}
			};
		}}
		class="space-y-5"
		novalidate
	>
		<AuthAlert message={displayError} />

		<div class="space-y-1.5">
			<Label
				for="magic-email"
				class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
			>
				Email address
			</Label>
			<div class="relative">
				<Mail
					class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
				/>
				<Input
					id="magic-email"
					type="email"
					name="email"
					bind:value={email}
					placeholder="you@example.com"
					class="h-11 border-border/50 bg-background/50 pl-10 transition-colors focus:border-primary/50 focus:bg-background"
					required
					disabled={isSubmitting}
				/>
			</div>
		</div>

		<div class="flex flex-col gap-3 pt-2">
			<Button
				type="submit"
				class="h-11 w-full font-medium"
				disabled={isSubmitting}
			>
				{#if isSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Sending...
				{:else}
					<Sparkles class="mr-2 h-4 w-4" />
					Send magic link
				{/if}
			</Button>

			<Button
				variant="ghost"
				type="button"
				class="h-10 w-full text-muted-foreground hover:text-foreground"
				onclick={handleBack}
				disabled={isSubmitting}
			>
				Log in with password
				<ArrowRight class="ml-2 h-4 w-4" />
			</Button>
		</div>
	</form>
{:else}
	<form
		bind:this={otpFormRef}
		method="POST"
		action="?/verifyOTP"
		use:enhance={() => {
			isSubmitting = true;
			errorMessage = null;
			return async ({ result, update }) => {
				isSubmitting = false;
				if (result.type === 'failure') {
					errorMessage =
						(result.data as { otpError?: string })?.otpError ??
						'Verification failed';
				} else {
					await update();
				}
			};
		}}
		class="space-y-5"
	>
		<AuthAlert message={displayError} />
		<AuthAlert message={displaySuccess} variant="success" />

		<input type="hidden" name="email" value={displayEmail} />
		<input type="hidden" name="code" value={code} />

		<div class="space-y-3">
			<Label
				class="flex justify-center text-xs font-medium tracking-wider text-muted-foreground uppercase"
			>
				Enter your 6-digit code
			</Label>
			<div class=" flex justify-center py-2">
				<InputOTP.Root
					autofocus
					maxlength={6}
					bind:value={code}
					disabled={isSubmitting}
					inputmode="numeric"
					pattern="^[0-9]+$"
					onComplete={() => otpFormRef?.requestSubmit()}
				>
					{#snippet children({ cells })}
						<div class="flex w-full items-center justify-around gap-2">
							<InputOTP.Group>
								{#each cells.slice(0, 3) as cell (cell)}
									<InputOTP.Slot class="h-12 w-10" {cell} />
								{/each}
							</InputOTP.Group>
							<span class="text-border">•</span>
							<InputOTP.Group>
								{#each cells.slice(3, 6) as cell (cell)}
									<InputOTP.Slot class="h-12 w-10" {cell} />
								{/each}
							</InputOTP.Group>
						</div>
					{/snippet}
				</InputOTP.Root>
			</div>
			<p class="text-center text-xs text-muted-foreground">
				Sent to {displayEmail}
			</p>
		</div>

		<div class="flex flex-col items-center gap-3 pt-2">
			<Button
				type="submit"
				class="h-11 w-full"
				disabled={isSubmitting || code.length !== 6}
			>
				{#if isSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Verifying...
				{:else}
					Verify code
				{/if}
			</Button>

			<Button
				variant="ghost"
				type="button"
				class="h-10 w-full text-muted-foreground hover:text-foreground"
				onclick={handleBack}
				disabled={isSubmitting}
			>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back
			</Button>
		</div>
	</form>
{/if}
