<!-- @component Admin Organizations Page - displays a table of all organizations with subscription info -->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { formatDate } from '$lib/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function getPlanBadgeVariant(
		planName: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		if (planName === 'pro') return 'default';
		return 'secondary';
	}

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
</script>

<svelte:head>
	<title>Organizations | Admin</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-2xl font-bold">Organizations</h1>

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
										href="/admin/organizations/{organization.id}"
										class="text-primary hover:underline"
									>
										{organization.name}
									</a>
								</Table.Cell>
								<Table.Cell class="text-center">
									{organization.userCount}
								</Table.Cell>
								<Table.Cell>
									{#if organization.subscription}
										<Badge
											variant={getPlanBadgeVariant(
												organization.subscription.plan.name
											)}
										>
											{organization.subscription.plan.display_name}
										</Badge>
									{:else}
										<span class="text-muted-foreground">No subscription</span>
									{/if}
								</Table.Cell>
								<Table.Cell>
									{#if organization.subscription}
										<Badge
											variant={getStatusBadgeVariant(
												organization.subscription.status
											)}
										>
											{formatStatus(organization.subscription.status)}
										</Badge>
									{:else}
										<span class="text-muted-foreground">-</span>
									{/if}
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
