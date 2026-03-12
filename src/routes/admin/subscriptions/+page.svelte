<!-- @component Admin Subscriptions Page - displays a table of all subscriptions -->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Empty from '$lib/components/ui/empty';
	import Building2 from '@lucide/svelte/icons/building-2';
	import * as Table from '$lib/components/ui/table';
	import { formatDate } from '$lib/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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

	function truncateStripeId(id: string): string {
		if (id.length <= 20) return id;
		return `${id.slice(0, 20)}...`;
	}
</script>

<svelte:head>
	<title>Pro Subscriptions | Admin</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-2xl font-bold">Pro Subscriptions</h1>

	<Card.Root>
		<Card.Header>
			<Card.Title>Pro Subscriptions</Card.Title>
			<Card.Description>
				View and manage all organizations with active subscriptions
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.organizations.length > 0}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Organization</Table.Head>
							<Table.Head>Plan</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Stripe ID</Table.Head>
							<Table.Head>Period Start</Table.Head>
							<Table.Head>Period End</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.organizations as org (org.id)}
							<Table.Row>
								<Table.Cell class="font-medium">
									<a
										href={resolve(`/admin/organizations/${org.id}`)}
										class="text-primary hover:underline"
									>
										{org.name}
									</a>
								</Table.Cell>
								<Table.Cell>
									<Badge variant="secondary">
										{org.plan === 'pro' ? 'Pro' : 'Free'}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									<Badge
										variant={getStatusBadgeVariant(
											org.subscription_status || 'inactive'
										)}
									>
										{formatStatus(org.subscription_status || 'Inactive')}
									</Badge>
								</Table.Cell>
								<Table.Cell class="font-mono text-sm text-muted-foreground">
									{org.stripe_subscription_id
										? truncateStripeId(org.stripe_subscription_id)
										: '—'}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{org.billing_period_starts_at
										? formatDate(org.billing_period_starts_at)
										: '—'}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{org.billing_period_ends_at
										? formatDate(org.billing_period_ends_at)
										: '—'}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{:else}
				<Empty.Root>
					<Empty.Header>
						<Empty.Media variant="icon"><Building2 /></Empty.Media>
						<Empty.Title>No organizations found</Empty.Title>
					</Empty.Header>
				</Empty.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
