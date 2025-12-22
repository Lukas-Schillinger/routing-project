<!-- @component Organization card for account page -->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import type { Organization, PublicUser } from '$lib/schemas';
	import { organizationApi, usersApi } from '$lib/services/api/auth';
	import type { Permission } from '$lib/services/server/permissions';
	import { checkPermission, formatDate } from '$lib/utils';
	import { Trash2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	// Props
	let {
		organization = $bindable(),
		organizationUsers,
		currentUser,
		permissions
	}: {
		organization: Organization;
		organizationUsers: PublicUser[];
		currentUser: PublicUser;
		permissions: Permission[];
	} = $props();

	const canDeleteUsers = $derived(checkPermission(permissions, 'users:delete'));

	// Form state
	let nameValue = $state(organization.name);
	let isSavingName = $state(false);
	let nameTimeout: ReturnType<typeof setTimeout> | null = null;

	// Debounced save for name field
	function handleNameInput() {
		if (nameTimeout) clearTimeout(nameTimeout);
		nameTimeout = setTimeout(() => saveName(), 800);
	}

	async function saveName() {
		const newName = nameValue.trim();
		if (!newName || newName === organization.name) return;

		isSavingName = true;
		try {
			const updatedOrg = await organizationApi.update(organization.id, { name: newName });
			organization = updatedOrg;
			await invalidateAll();
			toast.success('Organization updated');
		} catch (error) {
			console.error('Failed to update organization:', error);
			toast.error('Failed to update organization');
			nameValue = organization.name;
		} finally {
			isSavingName = false;
		}
	}

	// Save on blur (in case user tabs away before debounce)
	function handleNameBlur() {
		if (nameTimeout) {
			clearTimeout(nameTimeout);
			nameTimeout = null;
		}
		saveName();
	}

	// Delete user
	let deletingUserId = $state<string | null>(null);

	async function handleDeleteUser(userId: string) {
		deletingUserId = userId;
		try {
			await usersApi.delete(userId);
			await invalidateAll();
			toast.success('User deleted');
		} catch (error) {
			console.error('Failed to delete user:', error);
			toast.error('Failed to delete user');
		} finally {
			deletingUserId = null;
		}
	}
</script>

<Card.Root>
	<Card.Header>
		{canDeleteUsers}
		<Card.Title>Organization</Card.Title>
		<Card.Description>Manage your organization settings and information</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-1">
		<!-- Organization Name (editable) -->
		<div
			class="flex flex-col gap-1 border-b py-4 md:flex-row md:items-center md:justify-between md:gap-4"
		>
			<div class="shrink-0 md:w-48">
				<p class="text-sm font-medium">Organization name</p>
			</div>
			<Input
				type="text"
				bind:value={nameValue}
				oninput={handleNameInput}
				onblur={handleNameBlur}
				placeholder="Enter organization name"
				disabled={isSavingName}
				class="max-w-xs"
			/>
		</div>

		<!-- Created (read-only) -->
		<div
			class="flex flex-col gap-1 border-b py-4 md:flex-row md:items-center md:justify-between md:gap-4"
		>
			<div class="shrink-0 md:w-48">
				<p class="text-sm font-medium">Created</p>
			</div>
			<p class="text-sm text-muted-foreground">{formatDate(organization.created_at)}</p>
		</div>

		<!-- Organization ID (read-only) -->
		<div
			class="flex flex-col gap-1 border-b py-4 md:flex-row md:items-center md:justify-between md:gap-4"
		>
			<div class="shrink-0 md:w-48">
				<p class="text-sm font-medium">Organization ID</p>
			</div>
			<p class="font-mono text-sm text-muted-foreground">{organization.id}</p>
		</div>

		<!-- Members Table -->
		<div class="py-4">
			<div class="shrink-0">
				<p class="text-sm font-medium">Members ({organizationUsers.length})</p>
			</div>
			<Table.Root class="">
				<Table.Header>
					<Table.Row class="p-0">
						<Table.Head class="p-0 text-sm font-semibold text-muted-foreground">email</Table.Head>
						<Table.Head class="p-0 text-sm text-muted-foreground">role</Table.Head>
						<Table.Head class="p-0 text-sm text-muted-foreground">joined</Table.Head>
						{#if canDeleteUsers}
							<Table.Head class="w-10 p-0"></Table.Head>
						{/if}
					</Table.Row>
				</Table.Header>
				<Table.Body class="text-sm text-muted-foreground">
					{#each organizationUsers as user (user.id)}
						<Table.Row>
							<Table.Cell class="px-0 text-card-foreground">{user.email}</Table.Cell>
							<Table.Cell class="px-0">
								<Badge class="w-20 justify-center" variant="secondary">
									{user.role}
								</Badge>
							</Table.Cell>
							<Table.Cell class="px-0 text-sm text-muted-foreground">
								{formatDate(user.created_at)}
							</Table.Cell>
							{#if canDeleteUsers}
								<Table.Cell class="px-0">
									{#if user.id !== currentUser.id}
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-muted-foreground hover:text-destructive"
											onclick={() => handleDeleteUser(user.id)}
											disabled={deletingUserId === user.id}
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									{/if}
								</Table.Cell>
							{/if}
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell
								colspan={canDeleteUsers ? 4 : 3}
								class="text-center text-muted-foreground"
							>
								No users in this organization
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</Card.Content>
</Card.Root>
