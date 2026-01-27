<!-- @component Admin Organization Detail Page - displays detailed info for a single organization -->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { formatDate } from '$lib/utils';
	import { RefreshCw } from 'lucide-svelte';
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

	// Set plan state
	let selectedPlanId = $state('');
	let isSettingPlan = $state(false);

	// Sync selectedPlanId when data changes (e.g., after plan update)
	$effect(() => {
		selectedPlanId = data.subscription?.plan.id ?? '';
	});

	function getStatusBadgeVariant(
		status: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		const activeStatuses = ['active', 'trialing'];
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

	async function handleSetPlan() {
		if (!selectedPlanId || selectedPlanId === data.subscription?.plan.id)
			return;

		isSettingPlan = true;
		try {
			const response = await fetch('/api/admin/subscriptions/set-plan', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					organizationId: data.organization.id,
					planId: selectedPlanId
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to set plan');
			}

			toast.success('Plan updated successfully');
			await invalidateAll();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to set plan'
			);
		} finally {
			isSettingPlan = false;
		}
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
			await invalidateAll();
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
			await invalidateAll();
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
</script>

<svelte:head>
	<title>{data.organization.name} | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center gap-2">
		<a href="/admin/organizations" class="text-muted-foreground hover:underline"
			>Organizations</a
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
				{#if data.subscription}
					<div class="flex justify-between">
						<span class="text-sm text-muted-foreground">Plan</span>
						<Badge variant="secondary"
							>{data.subscription.plan.display_name}</Badge
						>
					</div>
					<div class="flex justify-between">
						<span class="text-sm text-muted-foreground">Status</span>
						<Badge
							variant={getStatusBadgeVariant(
								data.subscription.subscription.status
							)}
						>
							{formatStatus(data.subscription.subscription.status)}
						</Badge>
					</div>
					<div class="flex justify-between">
						<span class="text-sm text-muted-foreground">Period Start</span>
						<span class="text-sm"
							>{formatDateLong(
								data.subscription.subscription.period_starts_at
							)}</span
						>
					</div>
					<div class="flex justify-between">
						<span class="text-sm text-muted-foreground">Period End</span>
						<span class="text-sm"
							>{formatDateLong(
								data.subscription.subscription.period_ends_at
							)}</span
						>
					</div>
					<div class="flex justify-between">
						<span class="text-sm text-muted-foreground">Credit Balance</span>
						<span class="text-sm font-medium">{data.creditBalance}</span>
					</div>

					<!-- Set Plan -->
					<div class="border-t pt-4">
						<Label for="set-plan" class="text-sm text-muted-foreground"
							>Change Plan</Label
						>
						<div class="mt-2 flex gap-2">
							<Select.Root
								type="single"
								value={selectedPlanId}
								onValueChange={(value) => {
									if (value) selectedPlanId = value;
								}}
							>
								<Select.Trigger id="set-plan" class="flex-1">
									{@const selected = data.plans.find(
										(p) => p.id === selectedPlanId
									)}
									{selected?.display_name ?? 'Select plan'}
								</Select.Trigger>
								<Select.Content>
									{#each data.plans as plan (plan.id)}
										<Select.Item value={plan.id}
											>{plan.display_name}</Select.Item
										>
									{/each}
								</Select.Content>
							</Select.Root>
							<Button
								variant="outline"
								size="default"
								onclick={handleSetPlan}
								disabled={isSettingPlan ||
									selectedPlanId === data.subscription.plan.id}
							>
								{isSettingPlan ? 'Setting...' : 'Set Plan'}
							</Button>
						</div>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">No subscription</p>
				{/if}
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
					<RefreshCw class="mr-2 h-4 w-4 {isSyncing ? 'animate-spin' : ''}" />
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
						{#if data.stripeComparison.local.subscription}
							<div class="rounded-md border p-3 text-sm">
								<p>
									<span class="text-muted-foreground">Status:</span>
									{data.stripeComparison.local.subscription.status}
								</p>
								<p>
									<span class="text-muted-foreground">Plan:</span>
									{data.stripeComparison.local.plan?.name || 'N/A'}
								</p>
								<p>
									<span class="text-muted-foreground">Stripe Sub ID:</span>
									<span class="font-mono text-xs">
										{data.stripeComparison.local.subscription
											.stripe_subscription_id || 'N/A'}
									</span>
								</p>
							</div>
						{:else}
							<p class="text-sm text-muted-foreground">No local subscription</p>
						{/if}
					</div>

					<!-- Stripe Data -->
					<div class="space-y-2">
						<h4 class="text-sm font-semibold">Stripe Data</h4>
						{#if data.stripeComparison.stripe}
							<div class="rounded-md border p-3 text-sm">
								<p>
									<span class="text-muted-foreground">Status:</span>
									{data.stripeComparison.stripe.subscription?.status || 'N/A'}
								</p>
								<p>
									<span class="text-muted-foreground">Customer:</span>
									<span class="font-mono text-xs">
										{data.stripeComparison.stripe.customer?.id || 'N/A'}
									</span>
								</p>
								<p>
									<span class="text-muted-foreground">Email:</span>
									{data.stripeComparison.stripe.customer &&
									'email' in data.stripeComparison.stripe.customer
										? data.stripeComparison.stripe.customer.email || 'N/A'
										: 'N/A'}
								</p>
							</div>
						{:else}
							<p class="text-sm text-muted-foreground">No Stripe data found</p>
						{/if}
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
							placeholder="Enter amount"
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
							placeholder="Optional description"
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
</div>
