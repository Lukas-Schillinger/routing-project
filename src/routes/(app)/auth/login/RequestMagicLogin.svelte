<script lang="ts">
	import { enhance } from '$app/forms';
	import { AuthAlert } from '$lib/components/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as InputOTP from '$lib/components/ui/input-otp';
	import { Label } from '$lib/components/ui/label';
	import { loginTokensApi } from '$lib/services/api/auth';
	import { ArrowLeft, Loader2, Mail, Sparkles } from 'lucide-svelte';

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

	let internalEmail = $state(initialEmail);
	let email = $derived(debugEmail ?? internalEmail);
	let code = $state('');
	let isSubmitting = $state(false);
	let internalOtpSent = $state(initialOtpSent);

	let internalErrorMessage = $state<string | null>(null);
	let internalSuccessMessage = $state<string | null>(null);

	// Use debug values if provided, otherwise use internal state
	let otpSent = $derived(debugOtpSent ?? internalOtpSent);
	let errorMessage = $derived(debugError ?? internalErrorMessage);
	let successMessage = $derived(debugSuccess ?? internalSuccessMessage);

	async function handleRequestOTP(e: Event) {
		e.preventDefault();

		if (!internalEmail) {
			internalErrorMessage = 'Email is required';
			return;
		}

		isSubmitting = true;
		internalErrorMessage = null;
		internalSuccessMessage = null;

		try {
			await loginTokensApi.requestLoginToken({ email });
			internalSuccessMessage = 'Check your inbox for a login code';
			internalOtpSent = true;
		} catch (err) {
			internalErrorMessage = err instanceof Error ? err.message : 'Error sending login code';
		} finally {
			isSubmitting = false;
		}
	}

	function handleBack() {
		if (otpSent) {
			internalOtpSent = false;
			code = '';
			internalErrorMessage = null;
			internalSuccessMessage = null;
		} else {
			onBack();
		}
	}
</script>

{#if !otpSent}
	<form onsubmit={handleRequestOTP} class="space-y-5">
		<AuthAlert message={errorMessage} />

		<div class="space-y-1.5">
			<Label
				for="magic-email"
				class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
			>
				Email address
			</Label>
			<div class="relative">
				<Mail class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
				<Input
					id="magic-email"
					type="email"
					bind:value={internalEmail}
					placeholder="you@example.com"
					class="h-11 border-border/50 bg-background/50 pl-10 transition-colors focus:border-primary/50 focus:bg-background"
					required
					disabled={isSubmitting}
				/>
			</div>
		</div>

		<div class="flex flex-col gap-3 pt-2">
			<Button type="submit" class="h-11 w-full font-medium" disabled={isSubmitting}>
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
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back to password
			</Button>
		</div>
	</form>
{:else}
	<form
		method="POST"
		action="?/verifyOTP"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
			};
		}}
		class="space-y-5"
	>
		<AuthAlert message={errorMessage} />
		<AuthAlert message={successMessage} variant="success" />

		<input type="hidden" name="email" value={email} />
		<input type="hidden" name="code" value={code} />

		<div class="space-y-3">
			<Label
				class="flex justify-center text-xs font-medium tracking-wider text-muted-foreground uppercase"
			>
				Enter your 6-digit code
			</Label>
			<div class=" flex justify-center py-2">
				<InputOTP.Root maxlength={6} bind:value={code} disabled={isSubmitting}>
					{#snippet children({ cells })}
						<div class="flex w-full max-w-60 items-center justify-around gap-2">
							<InputOTP.Group>
								{#each cells.slice(0, 3) as cell (cell)}
									<InputOTP.Slot {cell} />
								{/each}
							</InputOTP.Group>
							<span class="text-border">•</span>
							<InputOTP.Group>
								{#each cells.slice(3, 6) as cell (cell)}
									<InputOTP.Slot {cell} />
								{/each}
							</InputOTP.Group>
						</div>
					{/snippet}
				</InputOTP.Root>
			</div>
			<p class="text-center text-xs text-muted-foreground">
				Sent to {email}
			</p>
		</div>

		<div class="flex flex-col items-center gap-3 pt-2">
			<Button type="submit" class="h-11 w-full" disabled={isSubmitting || code.length !== 6}>
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
