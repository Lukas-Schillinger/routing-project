<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { MagicInvite } from '$lib/schemas';
	import { magicLinksApi } from '$lib/services/api/auth';
	import { Check, LoaderCircle, Mail, TriangleAlert } from 'lucide-svelte';

	// Props
	let {
		open = $bindable(false),
		onCreateMagicInvite = () => {}
	}: {
		open: boolean;
		onCreateMagicInvite?: (magicInvite: MagicInvite) => void;
	} = $props();

	// State
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	// Form fields
	let email = $state('');

	// Reset form
	function resetForm() {
		email = '';
		error = null;
	}

	// Validate email format
	function isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	// Submit handler
	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;

		// Validate email
		if (!email.trim()) {
			error = 'Email address is required';
			return;
		}

		if (!isValidEmail(email.trim())) {
			error = 'Please enter a valid email address';
			return;
		}

		isSubmitting = true;

		try {
			// Create the magic invite using the API service
			const newInvite = await magicLinksApi.requestInvite({
				type: 'invite',
				email: email.trim(),
				token_duration_hours: 168 // 7 days
			});

			// Call success callback
			onCreateMagicInvite(newInvite);

			// Close popover and reset form
			open = false;
			resetForm();
		} catch (err) {
			console.error('Error creating magic invite:', err);
			error = err instanceof Error ? err.message : 'An unexpected error occurred';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
	<div class="space-y-2">
		<div class="flex items-center gap-2">
			<Mail class="h-5 w-5 text-muted-foreground" />
			<h3 class="text-lg font-semibold">Send Team Invitation</h3>
		</div>
		<p class="text-sm text-muted-foreground">
			Invite a new team member to collaborate on route optimization
		</p>
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<TriangleAlert class="h-4 w-4" />
			<Alert.Title>Error</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="space-y-2">
		<Label for="invite-email">Email Address *</Label>
		<Input
			id="invite-email"
			type="email"
			bind:value={email}
			placeholder="colleague@company.com"
			disabled={isSubmitting}
			required
			autocomplete="email"
		/>
		<p class="text-xs text-muted-foreground">The invitation will be sent to this email address</p>
	</div>

	<div class="flex gap-2">
		<Button
			type="button"
			variant="outline"
			class="flex-1"
			onclick={() => (open = false)}
			disabled={isSubmitting}
		>
			Cancel
		</Button>
		<Button type="submit" class="flex-1" disabled={isSubmitting || !email.trim()}>
			{#if isSubmitting}
				<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
				Sending...
			{:else}
				<Check class="mr-2 h-4 w-4" />
				Send Invitation
			{/if}
		</Button>
	</div>
</form>
