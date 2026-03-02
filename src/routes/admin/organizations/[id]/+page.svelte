<!-- @component Admin Organization Detail Page - displays detailed info for a single organization -->
<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { INVALIDATION_KEYS } from '$lib/invalidation-keys';
	import { resolve } from '$app/paths';
	import { ConfirmDeleteDialog } from '$lib/components/ConfirmDeleteDialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { formatDate } from '$lib/utils';
	import { LogIn, RefreshCw, Trash2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Form state for credit adjustment
	let creditAmount = $state('');
	let creditType = $state<'adjustment' | 'refund'>('adjustment');
	let creditDescription = $state('');
	let isSubmittingCredits = $state(false);

	// Sync state
	let isSyncing = $state(false);

	// Impersonation state
	let impersonatingUserId = $state<string | null>(null);

	// Delete state
	let isDeleting = $state(false);

	async function handleLoginAs(userId: string) {
		impersonatingUserId = userId;
		try {
			const response = await fetch('/api/admin/impersonate/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(
					error.error || error.message || 'Failed to start impersonation'
				);
			}

			const result = await response.json();
			goto(resolve(result.redirectUrl || '/maps'));
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to login as user'
			);
		} finally {
			impersonatingUserId = null;
		}
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

	function formatDateLong(date: Date | string): string {
		const dateObj = typeof date === 'string' ? new Date(date) : date;
		return dateObj.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	async function handleSyncFromStripe() {
		isSyncing = true;
		try {
			const response = await fetch('/api/admin/subscriptions/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ organizationId: data.organization.id })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to sync');
			}

			toast.success('Subscription synced from Stripe');
			await invalidate(INVALIDATION_KEYS.ADMIN);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to sync from Stripe'
			);
		} finally {
			isSyncing = false;
		}
	}

	async function handleAdjustCredits(event: SubmitEvent) {
		event.preventDefault();
		isSubmittingCredits = true;

		try {
			const amount = parseInt(creditAmount, 10);
			if (isNaN(amount)) {
				throw new Error('Invalid amount');
			}

			const response = await fetch('/api/admin/credits/adjust', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					organizationId: data.organization.id,
					amount,
					type: creditType,
					description: creditDescription || undefined
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to adjust credits');
			}

			toast.success('Credits adjusted successfully');
			creditAmount = '';
			creditDescription = '';
			creditType = 'adjustment';
			await invalidate(INVALIDATION_KEYS.ADMIN);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to adjust credits'
			);
		} finally {
			isSubmittingCredits = false;
		}
	}

	function getTransactionBadgeVariant(
		type: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		if (type === 'credit' || type === 'refund') return 'default';
		if (type === 'debit') return 'destructive';
		return 'secondary';
	}

	async function handleDeleteOrganization() {
		isDeleting = true;
		try {
			const response = await fetch(
				`/api/admin/organizations/${data.organization.id}`,
				{ method: 'DELETE' }
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to delete organization');
			}

			toast.success('Organization deleted');
			goto(resolve('/admin/organizations'));
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to delete organization'
			);
		} finally {
			isDeleting = false;
		}
	}
</script>

<svelte:head>
	<title>{data.organization.name} | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center gap-2">
		<a
			href={resolve('/admin/organizations')}
			class="text-muted-foreground hover:underline">Organizations</a
		>
		<span class="text-muted-foreground">/</span>
		<h1 class="text-2xl font-bold">{data.organization.name}</h1>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Organization Info Card -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Organization Info</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex justify-between">
					<span class="text-sm text-muted-foreground">Name</span>
					<span class="text-sm font-medium">{data.organization.name}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-sm text-muted-foreground">ID</span>
					<span class="font-mono text-sm">{data.organization.id}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-sm text-muted-foreground">Created</span>
					<span class="text-sm"
						>{formatDateLong(data.organization.created_at)}</span
					>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Subscription Info Card -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Subscription</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex justify-between">
					<span class="text-sm text-muted-foreground">Plan</span>
					<Badge variant="secondary">
						{data.plan === 'pro' ? 'Pro' : 'Free'}
					</Badge>
				</div>
				<div class="flex justify-between">
					<span class="text-sm text-muted-foreground">Status</span>
					<Badge
						variant={getStatusBadgeVariant(
							data.organization.subscription_status || 'free'
						)}
					>
						{data.organization.subscription_status
							? formatStatus(data.organization.subscription_status)
							: 'Free'}
					</Badge>
				</div>
				<div class="flex justify-between">
					<span class="text-sm text-muted-foreground">Period Start</span>
					<span class="text-sm">
						{data.organization.billing_period_starts_at
							? formatDateLong(data.organization.billing_period_starts_at)
							: 'N/A'}
					</span>
				</div>
				<div class="flex justify-between">
					<span class="text-sm text-muted-foreground">Period End</span>
					<span class="text-sm">
						{data.organization.billing_period_ends_at
							? formatDateLong(data.organization.billing_period_ends_at)
							: 'N/A'}
					</span>
				</div>
				<div class="flex justify-between">
					<span class="text-sm text-muted-foreground">Credit Balance</span>
					<span class="text-sm font-medium">{data.creditBalance}</span>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Users Table -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Users ({data.users.length})</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if data.users.length > 0}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Name</Table.Head>
							<Table.Head>Email</Table.Head>
							<Table.Head>Role</Table.Head>
							<Table.Head>Joined</Table.Head>
							<Table.Head class="w-25"></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.users as user (user.id)}
							<Table.Row>
								<Table.Cell class="font-medium">
									{user.name || '-'}
								</Table.Cell>
								<Table.Cell>{user.email}</Table.Cell>
								<Table.Cell>
									<Badge variant="secondary">{user.role}</Badge>
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{formatDate(user.created_at)}
								</Table.Cell>
								<Table.Cell>
									<Button
										variant="outline"
										size="sm"
										onclick={() => handleLoginAs(user.id)}
										disabled={impersonatingUserId === user.id}
									>
										{#if impersonatingUserId === user.id}
											<RefreshCw class="mr-1 h-3 w-3 animate-spin" />
										{:else}
											<LogIn class="mr-1 h-3 w-3" />
										{/if}
										Login As
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{:else}
				<p class="py-8 text-center text-sm text-muted-foreground">
					No users found
				</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Stripe Comparison Card -->
	{#if data.stripeComparison}
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between">
				<div>
					<Card.Title>Stripe Comparison</Card.Title>
					<Card.Description>
						Compare local subscription data with Stripe
					</Card.Description>
				</div>
				<Button
					variant="outline"
					size="sm"
					onclick={handleSyncFromStripe}
					disabled={isSyncing}
				>
					<RefreshCw class="h-4 w-4 {isSyncing ? 'animate-spin' : ''}" />
					Sync from Stripe
				</Button>
			</Card.Header>
			<Card.Content>
				{#if data.stripeComparison.mismatches.length > 0}
					<div
						class="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3"
					>
						<p class="text-sm font-medium text-destructive">
							Mismatches detected:
						</p>
						<ul class="mt-1 list-inside list-disc text-sm text-destructive">
							{#each data.stripeComparison.mismatches as mismatch, index (index)}
								<li>{mismatch}</li>
							{/each}
						</ul>
					</div>
				{/if}

				<div class="grid gap-4 md:grid-cols-2">
					<!-- Local Data -->
					<div class="space-y-2">
						<h4 class="text-sm font-semibold">Local Data</h4>
						<div class="rounded-md border p-3 text-sm">
							<p>
								<span class="text-muted-foreground">Status:</span>
								{data.stripeComparison.local.status || 'N/A'}
							</p>
							<p>
								<span class="text-muted-foreground">Plan:</span>
								{data.stripeComparison.local.plan === 'pro' ? 'Pro' : 'Free'}
							</p>
							<p>
								<span class="text-muted-foreground">Stripe Sub ID:</span>
								<span class="font-mono text-xs">
									{data.stripeComparison.local.subscriptionId || 'N/A'}
								</span>
							</p>
						</div>
					</div>

					<!-- Stripe Data -->
					<div class="space-y-2">
						<h4 class="text-sm font-semibold">Stripe Data</h4>
						<div class="rounded-md border p-3 text-sm">
							<p>
								<span class="text-muted-foreground">Status:</span>
								{data.stripeComparison.stripe?.subscription?.status || 'N/A'}
							</p>
							<p>
								<span class="text-muted-foreground">Customer:</span>
								<span class="font-mono text-xs">
									{data.stripeComparison.stripe?.customer?.id || 'N/A'}
								</span>
							</p>
							<p>
								<span class="text-muted-foreground">Email:</span>
								{data.stripeComparison.stripe?.customer &&
								'email' in data.stripeComparison.stripe.customer
									? data.stripeComparison.stripe.customer.email || 'N/A'
									: 'N/A'}
							</p>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Credit Transactions Table -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Credit Transactions</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if data.transactions.length > 0}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Type</Table.Head>
							<Table.Head class="text-right">Amount</Table.Head>
							<Table.Head>Description</Table.Head>
							<Table.Head>Date</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.transactions as transaction (transaction.id)}
							<Table.Row>
								<Table.Cell>
									<Badge variant={getTransactionBadgeVariant(transaction.type)}>
										{transaction.type}
									</Badge>
								</Table.Cell>
								<Table.Cell
									class="text-right font-medium {transaction.amount >= 0
										? 'text-green-600'
										: 'text-red-600'}"
								>
									{transaction.amount >= 0 ? '+' : ''}{transaction.amount}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{transaction.description || '-'}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{formatDate(transaction.created_at)}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{:else}
				<p class="py-8 text-center text-sm text-muted-foreground">
					No transactions found
				</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Actions Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Actions</Card.Title>
			<Card.Description>Adjust credits for this organization</Card.Description>
		</Card.Header>
		<Card.Content>
			<form onsubmit={handleAdjustCredits} class="space-y-4">
				<div class="grid gap-4 sm:grid-cols-3">
					<div class="space-y-2">
						<Label for="credit-amount">Amount</Label>
						<Input
							id="credit-amount"
							type="number"
							placeholder="Enter amount…"
							bind:value={creditAmount}
							required
						/>
					</div>
					<div class="space-y-2">
						<Label for="credit-type">Type</Label>
						<Select.Root
							type="single"
							value={creditType}
							onValueChange={(value) => {
								if (value) creditType = value as 'adjustment' | 'refund';
							}}
						>
							<Select.Trigger id="credit-type" class="w-full">
								{creditType === 'adjustment' ? 'Adjustment' : 'Refund'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="adjustment">Adjustment</Select.Item>
								<Select.Item value="refund">Refund</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					<div class="space-y-2">
						<Label for="credit-description">Description</Label>
						<Input
							id="credit-description"
							type="text"
							placeholder="Optional description…"
							bind:value={creditDescription}
						/>
					</div>
				</div>
				<Button type="submit" disabled={isSubmittingCredits || !creditAmount}>
					{isSubmittingCredits ? 'Adjusting...' : 'Adjust Credits'}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<!-- Danger Zone -->
	<Card.Root class="border-destructive">
		<Card.Header>
			<Card.Title class="text-destructive">Danger Zone</Card.Title>
			<Card.Description>
				Irreversible actions that permanently affect this organization
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Delete this organization</p>
					<p class="text-sm text-muted-foreground">
						Permanently delete all users, subscriptions, and data.
					</p>
				</div>
				<ConfirmDeleteDialog
					title="Delete Organization"
					description="Are you sure you want to delete {data.organization
						.name}? This will permanently delete all users, subscriptions, and data. This action cannot be undone."
					onConfirm={handleDeleteOrganization}
				>
					{#snippet trigger({ props })}
						<Button {...props} variant="destructive" disabled={isDeleting}>
							<Trash2 class="h-4 w-4" />
							{isDeleting ? 'Deleting...' : 'Delete'}
						</Button>
					{/snippet}
				</ConfirmDeleteDialog>
			</div>
		</Card.Content>
	</Card.Root>
</div>
