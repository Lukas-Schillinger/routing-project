<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import type { DepotWithLocationJoin } from '$lib/schemas/depot';
	import { formatDate } from '$lib/utils';
	import { Building2, MapPin } from 'lucide-svelte';

	let {
		depots
	}: {
		depots: DepotWithLocationJoin[];
	} = $props();

	async function handleDepotCreated() {
		// Invalidate all data to refetch depots from server
		await invalidateAll();
	}
</script>

{#if depots.length === 0}
	<p class="body-medium mb-6 text-center text-muted-foreground">
		Create your first depot to set up a starting location for your routes.
	</p>
{:else}
	<div class="rounded-md border bg-card">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Name</Table.Head>
					<Table.Head>Address</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head>Created</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each depots as depot}
					<Table.Row>
						<Table.Cell>
							<div class="flex items-center">
								<Building2 class="mr-2 h-4 w-4 text-primary" />
								<span class="font-semibold">{depot.depot.name}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-start text-sm text-muted-foreground">
								<MapPin class="mt-0.5 mr-2 h-3 w-3 shrink-0" />
								<div>
									<div>{depot.location.address_line1}</div>
									{#if depot.location.city || depot.location.region}
										<div>
											{[depot.location.city, depot.location.region, depot.location.postal_code]
												.filter(Boolean)
												.join(', ')}
										</div>
									{/if}
								</div>
							</div>
						</Table.Cell>
						<Table.Cell>
							{#if depot.depot.default_depot}
								<Badge variant="default">Default</Badge>
							{:else}
								<Badge variant="outline">Active</Badge>
							{/if}
						</Table.Cell>
						<Table.Cell>
							<div class="text-sm text-muted-foreground">
								{formatDate(depot.depot.created_at)}
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
{/if}
