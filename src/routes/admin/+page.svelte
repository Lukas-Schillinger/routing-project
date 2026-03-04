<!-- @component Admin Dashboard - displays organization stats, subscription counts, and recent transactions -->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { formatDate } from '$lib/utils';
	import Building2 from '@lucide/svelte/icons/building-2';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function getTransactionBadgeVariant(
		type: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		const positiveTypes = ['purchase', 'refund'];
		const negativeTypes = ['usage'];

		if (negativeTypes.includes(type)) return 'destructive';
		if (positiveTypes.includes(type)) return 'default';
		return 'secondary';
	}

	function formatTransactionType(type: string): string {
		const labels: Record<string, string> = {
			purchase: 'Purchase',
			usage: 'Usage',
			adjustment: 'Adjustment',
			refund: 'Refund'
		};
		return labels[type] ?? type;
	}
</script>

<svelte:head>
	<title>Admin Dashboard</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-2xl font-bold">Dashboard</h1>

	<!-- Stats Cards -->
	<div class="grid gap-4 md:grid-cols-3">
		<!-- Total Organizations -->
		<Card.Root>
			<Card.Header
				class="flex flex-row items-center justify-between space-y-0 pb-2"
			>
				<Card.Title class="text-sm font-medium">Total Organizations</Card.Title>
				<Building2 class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.stats.totalOrganizations}</div>
				<p class="text-xs text-muted-foreground">Registered organizations</p>
			</Card.Content>
		</Card.Root>

		<!-- Pro Plan -->
		<Card.Root>
			<Card.Header
				class="flex flex-row items-center justify-between space-y-0 pb-2"
			>
				<Card.Title class="text-sm font-medium">Pro Plan</Card.Title>
				<TrendingUp class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.stats.proOrganizations}</div>
				<p class="text-xs text-muted-foreground">Active subscriptions</p>
			</Card.Content>
		</Card.Root>

		<!-- Free Plan -->
		<Card.Root>
			<Card.Header
				class="flex flex-row items-center justify-between space-y-0 pb-2"
			>
				<Card.Title class="text-sm font-medium">Free Plan</Card.Title>
				<CreditCard class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">
					{data.stats.totalOrganizations - data.stats.proOrganizations}
				</div>
				<p class="text-xs text-muted-foreground">Active subscriptions</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Recent Transactions -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Recent Credit Transactions</Card.Title>
			<Card.Description
				>Latest credit activity across all organizations</Card.Description
			>
		</Card.Header>
		<Card.Content>
			{#if data.stats.recentTransactions.length > 0}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Organization</Table.Head>
							<Table.Head>Type</Table.Head>
							<Table.Head>Description</Table.Head>
							<Table.Head class="text-right">Amount</Table.Head>
							<Table.Head>Date</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.stats.recentTransactions as transaction (transaction.id)}
							<Table.Row>
								<Table.Cell class="font-medium">
									{transaction.organizationName ?? 'Unknown'}
								</Table.Cell>
								<Table.Cell>
									<Badge variant={getTransactionBadgeVariant(transaction.type)}>
										{formatTransactionType(transaction.type)}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{transaction.description ?? '-'}
								</Table.Cell>
								<Table.Cell
									class="text-right font-medium {transaction.amount >= 0
										? 'text-green-600'
										: 'text-red-600'}"
								>
									{transaction.amount >= 0
										? '+'
										: ''}{transaction.amount.toLocaleString()}
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
					No transactions yet
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
