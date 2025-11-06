<!-- @component Security card for account page -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { formatDate } from '$lib/utils';
	import { Key, Shield } from 'lucide-svelte';
	import type { PageData } from './$types';

	// Props
	let {
		user
	}: {
		user: PageData['user'];
	} = $props();

	// Local state for editing
	let showChangePassword = $state(false);

	// Form data
	let passwordForm = $state({
		currentPassword: '',
		newPassword: '',
		confirmPassword: ''
	});

	// Functions for handling form submissions (disabled for now)
	function handlePasswordChange() {
		// TODO: Implement password change
		console.log('Password change not implemented yet');
		showChangePassword = false;
		passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
	}

	function handleCancelEdit() {
		showChangePassword = false;
		// Reset form
		passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<Key class="h-5 w-5" />
				<Card.Title>Security</Card.Title>
			</div>
			{#if !showChangePassword}
				<Button variant="outline" size="sm" onclick={() => (showChangePassword = true)} disabled>
					Change Password
				</Button>
			{/if}
		</div>
		<Card.Description>Manage your account security settings</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if showChangePassword}
			<!-- Change Password Form -->
			<div class="space-y-4">
				<div class="space-y-2">
					<Label for="current-password">Current Password</Label>
					<Input
						id="current-password"
						type="password"
						bind:value={passwordForm.currentPassword}
						placeholder="Enter current password"
					/>
				</div>

				<div class="space-y-2">
					<Label for="new-password">New Password</Label>
					<Input
						id="new-password"
						type="password"
						bind:value={passwordForm.newPassword}
						placeholder="Enter new password"
					/>
				</div>

				<div class="space-y-2">
					<Label for="confirm-password">Confirm New Password</Label>
					<Input
						id="confirm-password"
						type="password"
						bind:value={passwordForm.confirmPassword}
						placeholder="Confirm new password"
					/>
				</div>

				<div class="flex items-center gap-2">
					<Button onclick={handlePasswordChange} disabled size="sm">Update Password</Button>
					<Button variant="outline" onclick={handleCancelEdit} size="sm">Cancel</Button>
				</div>
			</div>
		{:else}
			<!-- Security Info -->
			<div class="space-y-4">
				<div class="flex items-center gap-3">
					<div class="rounded-full bg-green-100 p-2">
						<Shield class="h-4 w-4 text-green-600" />
					</div>
					<div>
						<Label class="text-sm font-medium">Password</Label>
						<p class="text-sm text-muted-foreground">
							Last updated {formatDate(user.updated_at)}
						</p>
					</div>
				</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
