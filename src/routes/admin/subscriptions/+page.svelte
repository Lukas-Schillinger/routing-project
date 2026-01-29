<!-- @component Admin Subscriptions Page - displays a table of all subscriptions -->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { formatDate } from '$lib/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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

	function truncateStripeId(id: string): string {
		if (id.length <= 20) return id;
		return `${id.slice(0, 20)}...`;
	}
</script>

<svelte:head>
	<title>Subscriptions | Admin</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-2xl font-bold">Subscriptions</h1>

	<Card.Root>
		<Card.Header>
			<Card.Title>All Subscriptions</Card.Title>
			<Card.Description>
				View and manage all subscription records
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.subscriptions.length > 0}
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
						{#each data.subscriptions as { subscription, organization, plan } (subscription.id)}
							<Table.Row>
								<Table.Cell class="font-medium">
									<a
										href={resolve(`/admin/organizations/${organization.id}`)}
										class="text-primary hover:underline"
									>
										{organization.name}
									</a>
								</Table.Cell>
								<Table.Cell>
									<Badge variant="secondary">
										{plan.display_name}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									<Badge variant={getStatusBadgeVariant(subscription.status)}>
										{formatStatus(subscription.status)}
									</Badge>
								</Table.Cell>
								<Table.Cell class="font-mono text-sm text-muted-foreground">
									{truncateStripeId(subscription.stripe_subscription_id)}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{formatDate(subscription.period_starts_at)}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{formatDate(subscription.period_ends_at)}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{:else}
				<p class="py-8 text-center text-sm text-muted-foreground">
					No subscriptions found
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
