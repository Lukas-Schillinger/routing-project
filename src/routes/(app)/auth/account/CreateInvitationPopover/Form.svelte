<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { createInvitationSchema, type Invitation } from '$lib/schemas';
	import { invitationsApi } from '$lib/services/api/auth';
	import { roleDescriptions } from '$lib/services/server/permissions';
	import { Check, LoaderCircle, Mail, TriangleAlert } from 'lucide-svelte';

	// Props
	let {
		open = $bindable(false),
		onCreateInvitation = () => {}
	}: {
		open: boolean;
		onCreateInvitation?: (invitation: Invitation) => void;
	} = $props();

	// State
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	// Form fields
	let email = $state('');
	let role = $state('');

	// Reset form
	function resetForm() {
		email = '';
		role = '';
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

		const data = createInvitationSchema.parse({ email, role });

		try {
			// Create the invitation using the API service
			const newInvitation = await invitationsApi.createInvitation({
				email: email.trim(),
				role: data.role
			});

			// Call success callback
			onCreateInvitation(newInvitation);

			// Close popover and reset form
			open = false;
			resetForm();
		} catch (err) {
			console.error('Error creating invitation:', err);
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
	<div class="space-y-2">
		<Label for="invite-role">Role</Label>
		<Select.Root type="single" value={role} onValueChange={(value) => (role = value)}>
			<Select.Trigger class="h-7 w-full">
				{role ? role : 'select role'}
			</Select.Trigger>
			<Select.Content>
				{#each roleDescriptions as role}
					<Select.Item value={role.name} class="flex flex-col items-start gap-1">
						<div class="text-sm">{role.name}</div>
						<div class="text-xs text-muted-foreground">
							{role.desc}
						</div>
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
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
