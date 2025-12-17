<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as InputOTP from '$lib/components/ui/input-otp';
	import { Label } from '$lib/components/ui/label';
	import { magicLinksApi } from '$lib/services/api/auth';
	import { enhance } from '$app/forms';
	import { ArrowLeft, CircleCheck, Mail, TriangleAlert } from 'lucide-svelte';

	let { onBack }: { onBack: () => void } = $props();

	let email = $state('');
	let code = $state('');
	let isSubmitting = $state(false);
	let otpSent = $state(false);

	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	async function handleRequestOTP(e: Event) {
		e.preventDefault();

		if (!email) {
			errorMessage = 'Email is required';
			return;
		}

		isSubmitting = true;
		errorMessage = null;
		successMessage = null;

		try {
			await magicLinksApi.requestLogin({
				email,
				type: 'login'
			});
			successMessage = 'A login code has been sent if an account matching that email exists.';
			otpSent = true;
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Error sending login code';
		} finally {
			isSubmitting = false;
		}
	}

	function handleBack() {
		if (otpSent) {
			otpSent = false;
			code = '';
			errorMessage = null;
			successMessage = null;
		} else {
			onBack();
		}
	}
</script>

{#if !otpSent}
	<form onsubmit={handleRequestOTP} class="space-y-4">
		{#if errorMessage}
			<Alert.Root variant="destructive" class="text-destructive">
				<TriangleAlert class="h-4 w-4" />
				<Alert.Title class="">Error</Alert.Title>
				<Alert.Description class="">{errorMessage}</Alert.Description>
			</Alert.Root>
		{/if}

		<div class="space-y-2">
			<Label for="magic-email" class="body-medium text-foreground">Email</Label>
			<div class="relative">
				<Mail class="absolute top-2.5 left-3 h-4 w-4" />
				<Input
					id="magic-email"
					type="email"
					bind:value={email}
					placeholder="Enter your email"
					class="pl-10"
					required
					disabled={isSubmitting}
				/>
			</div>
		</div>

		<Button type="submit" class="w-full" disabled={isSubmitting}>
			{#if isSubmitting}
				Sending...
			{:else}
				<Mail class="mr-2 h-4 w-4" />
				Send Login Code
			{/if}
		</Button>

		<Button variant="ghost" type="button" class="w-full" onclick={handleBack} disabled={isSubmitting}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Password Login
		</Button>
	</form>
{:else}
	<form method="POST" action="?/verifyOTP" use:enhance class="space-y-4">
		{#if errorMessage}
			<Alert.Root variant="destructive" class="text-destructive">
				<TriangleAlert class="h-4 w-4" />
				<Alert.Title class="">Error</Alert.Title>
				<Alert.Description class="">{errorMessage}</Alert.Description>
			</Alert.Root>
		{/if}

		{#if successMessage}
			<Alert.Root variant="default" class="">
				<CircleCheck class="h-4 w-4" />
				<Alert.Title class="line-clamp-2">{successMessage}</Alert.Title>
			</Alert.Root>
		{/if}

		<input type="hidden" name="email" value={email} />
		<input type="hidden" name="code" value={code} />

		<div class="space-y-2">
			<Label class="body-medium text-foreground">Login Code</Label>
			<div class="flex justify-center">
				<InputOTP.Root maxlength={6} bind:value={code} disabled={isSubmitting}>
					{#snippet children({ cells })}
						<InputOTP.Group>
							{#each cells as cell (cell)}
								<InputOTP.Slot {cell} />
							{/each}
						</InputOTP.Group>
					{/snippet}
				</InputOTP.Root>
			</div>
		</div>

		<Button type="submit" class="w-full" disabled={isSubmitting || code.length !== 6}>
			{#if isSubmitting}
				Verifying...
			{:else}
				Verify Code
			{/if}
		</Button>

		<Button variant="ghost" type="button" class="w-full" onclick={handleBack} disabled={isSubmitting}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back
		</Button>
	</form>
{/if}
