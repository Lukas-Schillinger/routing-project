<!-- @component Billing Card for account page - displays subscription, credits, and transaction history -->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { BillingModal } from '$lib/components/billing';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import { Spinner } from '$lib/components/ui/spinner';
	import * as Table from '$lib/components/ui/table';
	import type { CreditBalance } from '$lib/schemas/billing';
	import type {
		creditTransactions,
		CreditTransactionType
	} from '$lib/server/db/schema';
	import { billingApi } from '$lib/services/api/billing';
	import { formatDate } from '$lib/utils';
	import { ChevronDown } from 'lucide-svelte';
	import { slide } from 'svelte/transition';

	type Props = {
		plan: 'free' | 'pro';
		monthlyCredits: number;
		periodEndsAt: Date;
		cancelAtPeriodEnd: boolean;
		credits: CreditBalance;
		transactions: (typeof creditTransactions.$inferSelect)[];
		canManageBilling: boolean;
	};

	let {
		plan,
		monthlyCredits,
		periodEndsAt,
		cancelAtPeriodEnd,
		credits,
		transactions,
		canManageBilling
	}: Props = $props();

	// Billing modal state
	let billingModalOpen = $state(false);

	// Downgrade action state
	let downgradeLoading = $state(false);
	let downgradeError = $state<string | null>(null);

	async function handleDowngrade() {
		downgradeLoading = true;
		downgradeError = null;
		try {
			await billingApi.scheduleDowngrade();
			await invalidateAll();
		} catch (e) {
			downgradeError =
				e instanceof Error ? e.message : 'Failed to schedule downgrade';
		} finally {
			downgradeLoading = false;
		}
	}

	async function handleCancelDowngrade() {
		downgradeLoading = true;
		downgradeError = null;
		try {
			await billingApi.cancelScheduledDowngrade();
			await invalidateAll();
		} catch (e) {
			downgradeError =
				e instanceof Error ? e.message : 'Failed to cancel downgrade';
		} finally {
			downgradeLoading = false;
		}
	}

	// Collapsible state
	let historyOpen = $state(false);

	// Credit remaining calculations
	const remainingPercentage = $derived(
		monthlyCredits > 0
			? Math.round((credits.available / monthlyCredits) * 100)
			: 0
	);

	const progressColorClass = $derived.by(() => {
		if (remainingPercentage <= 0)
			return '[&_[data-slot=progress-indicator]]:bg-red-600';
		if (remainingPercentage <= 20)
			return '[&_[data-slot=progress-indicator]]:bg-yellow-600';
		return '[&_[data-slot=progress-indicator]]:bg-primary';
	});

	// Transaction formatting helpers
	function formatTransactionType(type: CreditTransactionType): string {
		const labels: Record<CreditTransactionType, string> = {
			purchase: 'Purchase',
			usage: 'Usage',
			adjustment: 'Adjustment',
			refund: 'Refund'
		};
		return labels[type];
	}

	function getTransactionBadgeVariant(
		type: CreditTransactionType
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		if (type === 'usage') return 'destructive';
		if (type === 'purchase' || type === 'refund') return 'default';
		return 'secondary';
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Billing & Subscription</Card.Title>
		<Card.Description>Manage your plan and credit usage</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-1">
		<!-- Plan Row -->
		<div
			class="flex flex-col gap-1 border-b py-4 md:flex-row md:items-center md:justify-between md:gap-4"
		>
			<div class="shrink-0 md:w-48">
				<p class="text-sm font-medium">Current Plan</p>
			</div>
			<div class="flex items-center gap-3">
				<Badge variant="secondary">{plan === 'pro' ? 'Pro' : 'Free'}</Badge>
				{#if canManageBilling && plan === 'free'}
					<Button
						variant="outline"
						size="sm"
						onclick={() => (billingModalOpen = true)}
					>
						Upgrade
					</Button>
				{/if}
				{#if canManageBilling && plan === 'pro' && !cancelAtPeriodEnd}
					<Button
						variant="ghost"
						size="sm"
						class="text-muted-foreground"
						onclick={handleDowngrade}
						disabled={downgradeLoading}
					>
						{#if downgradeLoading}
							<Spinner class="mr-2" />
						{/if}
						Downgrade
					</Button>
				{/if}
			</div>
		</div>

		<!-- Downgrade error -->
		{#if downgradeError}
			<p class="text-sm text-destructive">{downgradeError}</p>
		{/if}

		<!-- Downgrade Notice -->
		{#if cancelAtPeriodEnd}
			<div
				class="flex flex-col gap-1 border-b py-4 md:flex-row md:items-center md:justify-between md:gap-4"
			>
				<div class="shrink-0 md:w-48">
					<p class="text-sm font-medium text-yellow-600">Downgrade Scheduled</p>
				</div>
				<div class="flex items-center gap-3">
					<p class="text-sm text-yellow-600">
						Your plan will be downgraded on {formatDate(periodEndsAt)}
					</p>
					{#if canManageBilling}
						<Button
							variant="outline"
							size="sm"
							onclick={handleCancelDowngrade}
							disabled={downgradeLoading}
						>
							{#if downgradeLoading}
								<Spinner class="mr-2" />
							{/if}
							Keep Pro
						</Button>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Credits Row -->
		<div
			class="flex flex-col gap-1 border-b py-4 md:flex-row md:items-center md:justify-between md:gap-4"
		>
			<div class="shrink-0 md:w-48">
				<p class="text-sm font-medium">Credits</p>
			</div>
			<div class="flex flex-1 flex-col gap-2 md:max-w-xs">
				<Progress
					value={remainingPercentage}
					max={100}
					class={progressColorClass}
				/>
				<p class="text-sm text-muted-foreground">
					{credits.available.toLocaleString()} / {monthlyCredits.toLocaleString()}
				</p>
			</div>
		</div>

		<!-- Reset Date Row -->
		<div
			class="flex flex-col gap-1 border-b py-4 md:flex-row md:items-center md:justify-between md:gap-4"
		>
			<div class="shrink-0 md:w-48">
				<p class="text-sm font-medium">Credits Reset</p>
			</div>
			<p class="text-sm text-muted-foreground">
				{formatDate(periodEndsAt)}
			</p>
		</div>

		<!-- Transaction History Collapsible -->
		<div>
			<Button
				variant="ghost"
				class="-mx-3 flex w-[calc(100%+1.5rem)] items-center justify-between px-3 py-6 text-sm font-medium"
				onclick={() => (historyOpen = !historyOpen)}
			>
				<span>Transaction History ({transactions.length})</span>
				<ChevronDown
					class="h-4 w-4 shrink-0 transition-transform duration-200 {historyOpen
						? 'rotate-180'
						: ''}"
				/>
			</Button>
			{#if historyOpen}
				<div transition:slide={{ duration: 200 }}>
					{#if transactions.length > 0}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Date</Table.Head>
									<Table.Head>Type</Table.Head>
									<Table.Head>Description</Table.Head>
									<Table.Head class="text-right">Amount</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each transactions as transaction (transaction.id)}
									<Table.Row>
										<Table.Cell class="text-muted-foreground">
											{formatDate(transaction.created_at)}
										</Table.Cell>
										<Table.Cell>
											<Badge
												variant={getTransactionBadgeVariant(transaction.type)}
											>
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
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{:else}
						<p class="py-4 text-center text-sm text-muted-foreground">
							No transactions yet
						</p>
					{/if}
				</div>
			{/if}
		</div>
	</Card.Content>
</Card.Root>

<BillingModal
	bind:open={billingModalOpen}
	planSlug={plan}
	{credits}
	{monthlyCredits}
/>
