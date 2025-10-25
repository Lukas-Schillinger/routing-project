<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import { formatDate } from '$lib/utils';
	import { Building2, MapPin } from 'lucide-svelte';

	type DepotWithLocation = {
		depots: {
			id: string;
			organization_id: string;
			location_id: string;
			name: string;
			default_depot: boolean;
			created_at: Date;
			updated_at: Date;
		};
		locations: {
			id: string;
			organization_id: string;
			name: string | null;
			address_line1: string;
			address_line2: string | null;
			city: string | null;
			region: string | null;
			postal_code: string | null;
			country: string;
			lat: string | null;
			lon: string | null;
			geocode_provider: string | null;
			geocode_confidence: string | null;
			geocode_place_id: string | null;
			geocode_raw: unknown;
			address_hash: string | null;
			created_at: Date;
			updated_at: Date;
		};
	};

	let {
		depots
	}: {
		depots: DepotWithLocation[];
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
								<span class="font-semibold">{depot.depots.name}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-start text-sm text-muted-foreground">
								<MapPin class="mt-0.5 mr-2 h-3 w-3 shrink-0" />
								<div>
									<div>{depot.locations.address_line1}</div>
									{#if depot.locations.city || depot.locations.region}
										<div>
											{[depot.locations.city, depot.locations.region, depot.locations.postal_code]
												.filter(Boolean)
												.join(', ')}
										</div>
									{/if}
								</div>
							</div>
						</Table.Cell>
						<Table.Cell>
							{#if depot.depots.default_depot}
								<Badge variant="default">Default</Badge>
							{:else}
								<Badge variant="outline">Active</Badge>
							{/if}
						</Table.Cell>
						<Table.Cell>
							<div class="text-sm text-muted-foreground">
								{formatDate(depot.depots.created_at)}
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
{/if}
