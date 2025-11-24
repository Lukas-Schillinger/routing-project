<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { magicLinksApi } from '$lib/services/api/auth';
	import { ArrowLeft, CircleCheck, Mail, TriangleAlert } from 'lucide-svelte';

	let { onBack }: { onBack: () => void } = $props();

	let email = $state('');
	let isSubmitting = $state(false);

	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	async function handleSubmit(e: Event) {
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
			successMessage = 'A login link has been sent if an account matching that email exists. ';
			email = '';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Error sending magic link';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
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
			Send Magic Link
		{/if}
	</Button>

	<Button variant="ghost" type="button" class="w-full" onclick={onBack} disabled={isSubmitting}>
		<ArrowLeft class="mr-2 h-4 w-4" />
		Back to Password Login
	</Button>
</form>
