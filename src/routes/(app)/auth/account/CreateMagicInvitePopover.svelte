<!-- @component Create Magic Invite Popover for sending team invitations -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Popover from '$lib/components/ui/popover';
	import type { MagicInvite } from '$lib/schemas';
	import { magicLinksApi } from '$lib/services/api/auth';
	import { ApiError } from '$lib/services/api/base';
	import { Check, LoaderCircle, Mail, Plus } from 'lucide-svelte';

	// Props
	let {
		onCreateMagicInvite = () => {}
	}: {
		onCreateMagicInvite?: (magicInvite: MagicInvite) => void;
	} = $props();

	// State
	let open = $state(false);
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	// Form fields
	let email = $state('');
	let message = $state('');

	// Reset form
	function resetForm() {
		email = '';
		message = '';
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
			console.log(email);
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

			if (err instanceof ApiError) {
				// Handle API errors with status codes
				if (err.status === 409) {
					error = 'An invitation for this email address already exists';
				} else if (err.status === 403) {
					error = 'You do not have permission to send invitations';
				} else if (err.status === 400) {
					error = 'Invalid email address or request data';
				} else {
					error = err.message;
				}
			} else {
				error = 'An unexpected error occurred while sending the invitation';
			}
		} finally {
			isSubmitting = false;
		}
	}

	// Handle open change
	function handleOpenChange(isOpen: boolean) {
		open = isOpen;
		if (!isOpen && !isSubmitting) {
			resetForm();
		}
	}
</script>

<Popover.Root bind:open onOpenChange={handleOpenChange}>
	<Popover.Trigger>
		<Button variant="outline">
			<Plus class="mr-2 h-4 w-4" />
			Invite User
		</Button>
	</Popover.Trigger>
	<Popover.Content class="w-96">
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
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					{error}
				</div>
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
				<p class="text-xs text-muted-foreground">
					The invitation will be sent to this email address
				</p>
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
	</Popover.Content>
</Popover.Root>
