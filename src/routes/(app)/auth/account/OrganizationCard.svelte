<!-- @component Organization card for account page -->
<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { INVALIDATION_KEYS } from '$lib/invalidation-keys';
	import { ConfirmDeleteDialog } from '$lib/components/ConfirmDeleteDialog';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import type { Organization, Permission, PublicUser, Role } from '$lib/schemas';
	import { roleDescriptions } from '$lib/schemas/permissions';
	import { organizationApi, usersApi } from '$lib/services/api/auth';
	import { checkPermission, formatDate } from '$lib/utils';
	import { Trash2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	// Props
	let {
		organization = $bindable(),
		organizationUsers = $bindable(),
		currentUser,
		permissions
	}: {
		organization: Organization;
		organizationUsers: PublicUser[];
		currentUser: PublicUser;
		permissions: Permission[];
	} = $props();

	const canDeleteUsers = $derived(checkPermission(permissions, 'users:delete'));
	const canUpdateUsers = $derived(checkPermission(permissions, 'users:update'));

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
			const updatedOrg = await organizationApi.update(organization.id, {
				name: newName
			});
			organization = updatedOrg;
			await invalidate(INVALIDATION_KEYS.ACCOUNT);
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
	async function handleDeleteUser(userId: string) {
		await usersApi.delete(userId);
		await invalidate(INVALIDATION_KEYS.ACCOUNT);
		toast.success('User deleted');
	}

	// Update user role
	async function handleRoleChange(userId: string, newRole: Role) {
		try {
			const updatedUser = await usersApi.updateRole(userId, { role: newRole });
			organizationUsers = organizationUsers.map((u) =>
				u.id === userId ? updatedUser : u
			);
			toast.success('Role updated');
		} catch (error) {
			console.error('Failed to update role:', error);
			toast.error('Failed to update role');
			await invalidate(INVALIDATION_KEYS.ACCOUNT);
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Organization</Card.Title>
		<Card.Description
			>Manage your organization settings and information</Card.Description
		>
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
				placeholder="Enter organization name…"
				disabled={isSavingName || !canUpdateUsers}
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
			<p class="text-sm text-muted-foreground">
				{formatDate(organization.created_at)}
			</p>
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
						<Table.Head class="p-0 text-sm font-semibold text-muted-foreground"
							>email</Table.Head
						>
						<Table.Head class="p-0 text-sm text-muted-foreground"
							>role</Table.Head
						>
						<Table.Head
							class="hidden p-0 text-sm text-muted-foreground sm:block"
							>joined</Table.Head
						>
						{#if canDeleteUsers}
							<Table.Head class="w-8 p-0"></Table.Head>
						{/if}
					</Table.Row>
				</Table.Header>
				<Table.Body class="text-sm text-muted-foreground">
					{#each organizationUsers as user (user.id)}
						<Table.Row>
							<Table.Cell class="px-0 text-card-foreground"
								>{user.email}</Table.Cell
							>
							<Table.Cell class="px-0">
								{#if canUpdateUsers && user.id !== currentUser.id}
									<Select.Root
										type="single"
										value={user.role}
										onValueChange={(value) =>
											value && handleRoleChange(user.id, value as Role)}
									>
										<Select.Trigger class="h-7 w-24 text-sm">
											{user.role}
										</Select.Trigger>
										<Select.Content>
											{#each roleDescriptions as role (role.name)}
												<Select.Item
													value={role.name}
													class="flex flex-col items-start gap-1"
												>
													<div class="text-sm">{role.name}</div>
													<div class="text-xs text-muted-foreground">
														{role.desc}
													</div>
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								{:else}
									<Select.Root type="single" value={user.role} disabled>
										<Select.Trigger class="h-7 w-24 text-sm">
											{user.role}
										</Select.Trigger>
									</Select.Root>
								{/if}
							</Table.Cell>
							<Table.Cell
								class="hidden px-0 text-sm text-muted-foreground sm:table-cell"
							>
								{formatDate(user.created_at)}
							</Table.Cell>
							{#if canDeleteUsers}
								<Table.Cell class="px-0">
									{#if user.id !== currentUser.id}
										<ConfirmDeleteDialog
											title="Delete User"
											description="Are you sure you want to remove {user.email} from this organization? This action cannot be undone."
											onConfirm={() => handleDeleteUser(user.id)}
										>
											{#snippet trigger({ props })}
												<Button
													{...props}
													variant="ghost"
													size="icon"
													class="h-8 w-8 text-muted-foreground hover:text-destructive"
													aria-label="Remove user"
												>
													<Trash2 class="h-4 w-4" />
												</Button>
											{/snippet}
										</ConfirmDeleteDialog>
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
