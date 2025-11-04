<!-- @component Account page with user profile and organization settings -->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { formatDate } from '$lib/utils';
	import { Building2, Calendar, Key, Mail, Settings, Shield, User, Users } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Local state for editing
	let isEditingProfile = $state(false);
	let isEditingOrganization = $state(false);
	let showChangePassword = $state(false);

	// Form data
	let profileForm = $state({
		email: data.user.email
	});

	let organizationForm = $state({
		name: data.organization.name
	});

	let passwordForm = $state({
		currentPassword: '',
		newPassword: '',
		confirmPassword: ''
	});

	// Functions for handling form submissions (disabled for now)
	function handleProfileSave() {
		// TODO: Implement profile update
		console.log('Profile save not implemented yet');
		isEditingProfile = false;
	}

	function handleOrganizationSave() {
		// TODO: Implement organization update
		console.log('Organization save not implemented yet');
		isEditingOrganization = false;
	}

	function handlePasswordChange() {
		// TODO: Implement password change
		console.log('Password change not implemented yet');
		showChangePassword = false;
		passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
	}

	function handleCancelEdit() {
		isEditingProfile = false;
		isEditingOrganization = false;
		showChangePassword = false;

		// Reset forms
		profileForm.email = data.user.email;
		organizationForm.name = data.organization.name;
		passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
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

<svelte:head>
	<title>Account Settings | Routing Project</title>
	<meta name="description" content="Manage your account settings and organization preferences" />
</svelte:head>

<div class="container mx-auto max-w-4xl p-6">
	<div class="mb-6 flex items-center gap-3">
		<Settings class="h-6 w-6" />
		<h1 class="text-3xl font-bold">Account Settings</h1>
	</div>

	<div class="grid gap-6">
		<!-- User Profile Section -->
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
								<p class="text-sm text-muted-foreground">{data.user.email}</p>
							</div>
						</div>

						<div class="flex items-center gap-3">
							<Calendar class="h-4 w-4 text-muted-foreground" />
							<div>
								<Label class="text-sm font-medium">Member Since</Label>
								<p class="text-sm text-muted-foreground">{formatDate(data.user.created_at)}</p>
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

		<!-- Security Section -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<Key class="h-5 w-5" />
						<Card.Title>Security</Card.Title>
					</div>
					{#if !showChangePassword}
						<Button
							variant="outline"
							size="sm"
							onclick={() => (showChangePassword = true)}
							disabled
						>
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
									Last updated {formatDate(data.user.updated_at)}
								</p>
							</div>
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<Separator />

		<!-- Organization Section -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<Building2 class="h-5 w-5" />
						<Card.Title>Organization</Card.Title>
					</div>
					{#if !isEditingOrganization}
						<Button
							variant="outline"
							size="sm"
							onclick={() => (isEditingOrganization = true)}
							disabled
						>
							Edit Organization
						</Button>
					{/if}
				</div>
				<Card.Description>Manage your organization settings and information</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if isEditingOrganization}
					<!-- Edit Mode -->
					<div class="space-y-4">
						<div class="space-y-2">
							<Label for="org-name">Organization Name</Label>
							<div class="flex items-center gap-2">
								<Building2 class="h-4 w-4 text-muted-foreground" />
								<Input
									id="org-name"
									bind:value={organizationForm.name}
									placeholder="Enter organization name"
								/>
							</div>
						</div>

						<div class="flex items-center gap-2">
							<Button onclick={handleOrganizationSave} disabled size="sm">Save Changes</Button>
							<Button variant="outline" onclick={handleCancelEdit} size="sm">Cancel</Button>
						</div>
					</div>
				{:else}
					<!-- View Mode -->
					<div class="space-y-4">
						<div class="flex items-center gap-3">
							<Building2 class="h-4 w-4 text-muted-foreground" />
							<div>
								<Label class="text-sm font-medium">Organization Name</Label>
								<p class="text-sm text-muted-foreground">{data.organization.name}</p>
							</div>
						</div>

						<div class="flex items-center gap-3">
							<Calendar class="h-4 w-4 text-muted-foreground" />
							<div>
								<Label class="text-sm font-medium">Created</Label>
								<p class="text-sm text-muted-foreground">
									{formatDate(data.organization.created_at)}
								</p>
							</div>
						</div>

						<div class="flex items-center gap-3">
							<Users class="h-4 w-4 text-muted-foreground" />
							<div>
								<Label class="text-sm font-medium">Organization ID</Label>
								<p class="font-mono text-sm text-muted-foreground">{data.organization.id}</p>
							</div>
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Feature Settings (Coming Soon) -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-3">
					<Settings class="h-5 w-5" />
					Preferences
				</Card.Title>
				<Card.Description>Additional settings and preferences (coming soon)</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4 opacity-60">
					<div class="flex items-center justify-between">
						<div>
							<Label class="text-sm font-medium">Email Notifications</Label>
							<p class="text-sm text-muted-foreground">
								Receive updates about your routes and optimization
							</p>
						</div>
						<Button variant="outline" size="sm" disabled>
							<Settings class="mr-2 h-4 w-4" />
							Configure
						</Button>
					</div>

					<Separator />

					<div class="flex items-center justify-between">
						<div>
							<Label class="text-sm font-medium">API Access</Label>
							<p class="text-sm text-muted-foreground">
								Manage API keys and third-party integrations
							</p>
						</div>
						<Button variant="outline" size="sm" disabled>
							<Key class="mr-2 h-4 w-4" />
							Manage Keys
						</Button>
					</div>

					<Separator />

					<div class="flex items-center justify-between">
						<div>
							<Label class="text-sm font-medium">Data Export</Label>
							<p class="text-sm text-muted-foreground">Download your organization's data</p>
						</div>
						<Button variant="outline" size="sm" disabled>
							<Calendar class="mr-2 h-4 w-4" />
							Export Data
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
