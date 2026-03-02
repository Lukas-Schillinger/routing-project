<!-- @component Admin Organizations Page - displays a table of all organizations with subscription info -->
<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { INVALIDATION_KEYS } from '$lib/invalidation-keys';
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Table from '$lib/components/ui/table';
	import { formatDate } from '$lib/utils';
	import { Plus } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Create account dialog state
	let dialogOpen = $state(false);
	let email = $state('');
	let name = $state('');
	let organizationName = $state('');
	let isCreating = $state(false);

	function generateTestData() {
		const id = Math.random().toString(36).substring(2, 8);
		email = `test-${id}@example.com`;
		name = `Test User ${id}`;
		organizationName = `Test Org ${id}`;
	}

	function handleDialogOpen(open: boolean) {
		dialogOpen = open;
		if (open) {
			generateTestData();
		}
	}

	async function handleCreateAccount(event: SubmitEvent) {
		event.preventDefault();
		isCreating = true;

		try {
			const response = await fetch('/api/admin/accounts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					name: name || undefined,
					organizationName: organizationName || undefined
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to create account');
			}

			const result = await response.json();
			toast.success('Test account created');
			dialogOpen = false;
			await invalidate(INVALIDATION_KEYS.ADMIN);
			goto(resolve(`/admin/organizations/${result.organization.id}`));
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to create account'
			);
		} finally {
			isCreating = false;
		}
	}

	function getPlanBadgeVariant(
		planName: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		if (planName === 'pro') return 'default';
		return 'secondary';
	}

	function getStatusBadgeVariant(
		status: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		const activeStatuses = ['active'];
		const warningStatuses = ['past_due', 'unpaid'];
		const inactiveStatuses = [
			'canceled',
			'incomplete',
			'incomplete_expired',
			'paused'
		];

		if (activeStatuses.includes(status)) return 'default';
		if (warningStatuses.includes(status)) return 'destructive';
		if (inactiveStatuses.includes(status)) return 'outline';
		return 'secondary';
	}

	function formatStatus(status: string): string {
		return status
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}
</script>

<svelte:head>
	<title>Organizations | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Organizations</h1>
		<Dialog.Root open={dialogOpen} onOpenChange={handleDialogOpen}>
			<Dialog.Trigger>
				{#snippet child({ props })}
					<Button {...props}>
						<Plus class="h-4 w-4" />
						Create Test Account
					</Button>
				{/snippet}
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Create Test Account</Dialog.Title>
					<Dialog.Description>
						Create a new organization with admin user on Free tier.
					</Dialog.Description>
				</Dialog.Header>
				<form onsubmit={handleCreateAccount} class="space-y-4">
					<div class="space-y-2">
						<Label for="email">Email *</Label>
						<Input
							id="email"
							type="email"
							placeholder="test@example.com"
							bind:value={email}
							required
						/>
					</div>
					<div class="space-y-2">
						<Label for="name">User Name</Label>
						<Input
							id="name"
							type="text"
							placeholder="Test User"
							bind:value={name}
						/>
					</div>
					<div class="space-y-2">
						<Label for="organizationName">Organization Name</Label>
						<Input
							id="organizationName"
							type="text"
							placeholder="Test Organization"
							bind:value={organizationName}
						/>
					</div>
					<Dialog.Footer>
						<Button
							type="button"
							variant="outline"
							onclick={() => (dialogOpen = false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isCreating || !email}>
							{isCreating ? 'Creating...' : 'Create Account'}
						</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>All Organizations</Card.Title>
			<Card.Description>
				Manage and view all registered organizations
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.organizations.length > 0}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Name</Table.Head>
							<Table.Head class="text-center">Users</Table.Head>
							<Table.Head>Plan</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Created</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.organizations as organization (organization.id)}
							<Table.Row>
								<Table.Cell class="font-medium">
									<a
										href={resolve(`/admin/organizations/${organization.id}`)}
										class="text-primary hover:underline"
									>
										{organization.name}
									</a>
								</Table.Cell>
								<Table.Cell class="text-center">
									{organization.userCount}
								</Table.Cell>
								<Table.Cell>
									<Badge variant={getPlanBadgeVariant(organization.plan)}>
										{organization.plan === 'pro' ? 'Pro' : 'Free'}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									<Badge
										variant={getStatusBadgeVariant(
											organization.subscription_status ?? 'free'
										)}
									>
										{formatStatus(organization.subscription_status ?? 'free')}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{formatDate(organization.created_at)}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{:else}
				<p class="py-8 text-center text-sm text-muted-foreground">
					No organizations found
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
