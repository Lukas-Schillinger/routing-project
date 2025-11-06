<!-- @component Profile Information card for account page -->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { formatDate } from '$lib/utils';
	import { Calendar, Mail, Shield, User } from 'lucide-svelte';
	import type { PageData } from './$types';

	// Props
	let {
		user
	}: {
		user: PageData['user'];
	} = $props();

	// Local state for editing
	let isEditingProfile = $state(false);

	// Form data
	let profileForm = $state({
		email: user.email
	});

	// Functions for handling form submissions (disabled for now)
	function handleProfileSave() {
		// TODO: Implement profile update
		console.log('Profile save not implemented yet');
		isEditingProfile = false;
	}

	function handleCancelEdit() {
		isEditingProfile = false;
		// Reset form
		profileForm.email = user.email;
	}

	// Get user role badge variant
	function getRoleBadgeVariant(role?: string) {
		switch (role) {
			case 'admin':
				return 'destructive';
			case 'member':
				return 'default';
			case 'viewer':
				return 'secondary';
			default:
				return 'outline';
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<User class="h-5 w-5" />
				<Card.Title>Profile Information</Card.Title>
			</div>
			{#if !isEditingProfile}
				<Button variant="outline" size="sm" onclick={() => (isEditingProfile = true)} disabled>
					Edit Profile
				</Button>
			{/if}
		</div>
		<Card.Description>Manage your personal account information</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-4">
		{#if isEditingProfile}
			<!-- Edit Mode -->
			<div class="space-y-4">
				<div class="space-y-2">
					<Label for="email">Email Address</Label>
					<div class="flex items-center gap-2">
						<Mail class="h-4 w-4 text-muted-foreground" />
						<Input
							id="email"
							type="email"
							bind:value={profileForm.email}
							placeholder="Enter email address"
						/>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<Button onclick={handleProfileSave} disabled size="sm">Save Changes</Button>
					<Button variant="outline" onclick={handleCancelEdit} size="sm">Cancel</Button>
				</div>
			</div>
		{:else}
			<!-- View Mode -->
			<div class="space-y-4">
				<div class="flex items-center gap-3">
					<Mail class="h-4 w-4 text-muted-foreground" />
					<div>
						<Label class="text-sm font-medium">Email Address</Label>
						<p class="text-sm text-muted-foreground">{user.email}</p>
					</div>
				</div>

				<div class="flex items-center gap-3">
					<Calendar class="h-4 w-4 text-muted-foreground" />
					<div>
						<Label class="text-sm font-medium">Member Since</Label>
						<p class="text-sm text-muted-foreground">{formatDate(user.created_at)}</p>
					</div>
				</div>

				<div class="flex items-center gap-3">
					<Shield class="h-4 w-4 text-muted-foreground" />
					<div>
						<Label class="text-sm font-medium">Account Role</Label>
						<div class="mt-1">
							<Badge variant={getRoleBadgeVariant('member')}>Member</Badge>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
