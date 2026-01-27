<!-- @component Admin Credits Page - displays all credit transactions across organizations with adjustment form -->
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
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Form state for credit adjustment
	let selectedOrganizationId = $state('');
	let amount = $state('');
	let type = $state<'adjustment' | 'refund'>('adjustment');
	let description = $state('');
	let isSubmitting = $state(false);

	function getTypeBadgeVariant(
		transactionType: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		const positiveTypes = ['subscription_grant', 'purchase'];
		const negativeTypes = ['usage', 'expiration'];
		const neutralTypes = ['adjustment', 'refund'];

		if (positiveTypes.includes(transactionType)) return 'default';
		if (negativeTypes.includes(transactionType)) return 'destructive';
		if (neutralTypes.includes(transactionType)) return 'secondary';
		return 'outline';
	}

	function formatTransactionType(transactionType: string): string {
		return transactionType
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	function getSelectedOrganizationName(): string {
		const org = data.organizations.find((o) => o.id === selectedOrganizationId);
		return org?.name ?? 'Select organization';
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		isSubmitting = true;

		try {
			const parsedAmount = parseInt(amount, 10);
			if (isNaN(parsedAmount)) {
				throw new Error('Invalid amount');
			}

			if (!selectedOrganizationId) {
				throw new Error('Please select an organization');
			}

			const response = await fetch('/api/admin/credits/adjust', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					organizationId: selectedOrganizationId,
					amount: parsedAmount,
					type,
					description: description || undefined
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to adjust credits');
			}

			toast.success('Credits adjusted successfully');
			selectedOrganizationId = '';
			amount = '';
			description = '';
			type = 'adjustment';
			await invalidateAll();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to adjust credits'
			);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Credits | Admin</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-2xl font-bold">Credits</h1>

	<!-- Add Adjustment Form Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Add Credit Adjustment</Card.Title>
			<Card.Description>
				Add or remove credits from an organization
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<form onsubmit={handleSubmit} class="space-y-4">
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div class="space-y-2">
						<Label for="organization">Organization</Label>
						<Select.Root
							type="single"
							value={selectedOrganizationId}
							onValueChange={(value) => {
								if (value) selectedOrganizationId = value;
							}}
						>
							<Select.Trigger id="organization" class="w-full">
								{getSelectedOrganizationName()}
							</Select.Trigger>
							<Select.Content>
								{#each data.organizations as organization (organization.id)}
									<Select.Item value={organization.id}>
										{organization.name}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class="space-y-2">
						<Label for="amount">Amount</Label>
						<Input
							id="amount"
							type="number"
							placeholder="Enter amount (can be negative)"
							bind:value={amount}
							required
						/>
					</div>
					<div class="space-y-2">
						<Label for="type">Type</Label>
						<Select.Root
							type="single"
							value={type}
							onValueChange={(value) => {
								if (value) type = value as 'adjustment' | 'refund';
							}}
						>
							<Select.Trigger id="type" class="w-full">
								{type === 'adjustment' ? 'Adjustment' : 'Refund'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="adjustment">Adjustment</Select.Item>
								<Select.Item value="refund">Refund</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					<div class="space-y-2">
						<Label for="description">Description</Label>
						<Input
							id="description"
							type="text"
							placeholder="Optional description"
							bind:value={description}
						/>
					</div>
				</div>
				<Button
					type="submit"
					disabled={isSubmitting || !selectedOrganizationId || !amount}
				>
					{isSubmitting ? 'Submitting...' : 'Add Adjustment'}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<!-- Transactions Table Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>All Transactions</Card.Title>
			<Card.Description>
				Credit transactions across all organizations
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.transactions.length > 0}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Organization</Table.Head>
							<Table.Head>Type</Table.Head>
							<Table.Head class="text-right">Amount</Table.Head>
							<Table.Head>Description</Table.Head>
							<Table.Head>Date</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.transactions as transaction (transaction.id)}
							<Table.Row>
								<Table.Cell class="font-medium">
									<a
										href="/admin/organizations/{transaction.organization_id}"
										class="text-primary hover:underline"
									>
										{transaction.organizationName ?? 'Unknown'}
									</a>
								</Table.Cell>
								<Table.Cell>
									<Badge variant={getTypeBadgeVariant(transaction.type)}>
										{formatTransactionType(transaction.type)}
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
</div>
