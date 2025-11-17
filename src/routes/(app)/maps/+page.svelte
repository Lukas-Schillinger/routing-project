<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import EditOrCreateDepotPopover from '$lib/components/EditOrCreateDepotPopover';
	import EditOrCreateDriverPopover from '$lib/components/EditOrCreateDriverPopover';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Building2, Truck } from 'lucide-svelte';
	import { getContext } from 'svelte';
	import type { PageData } from './$types';
	import DepotsTable from './DepotsTable.svelte';
	import DriversTable from './DriversTable.svelte';
	import MapsTable from './MapsTable.svelte';

	let { data }: { data: PageData } = $props();

	// Set page header in layout context
	const pageHeaderContext = getContext<{ set: (header: any) => void }>('pageHeader');
	pageHeaderContext.set({
		breadcrumbs: [{ name: 'Maps', href: '/maps' }]
	});

	async function handleDepotCreated() {
		// Invalidate all data to refetch depots from server
		await invalidateAll();
	}

	async function handleDriverCreated() {
		// Invalidate all data to refetch depots from server
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Maps - Routing Project</title>
</svelte:head>

<div class="space-y-6">
	<!-- Maps Section -->
	<section class="space-y-6">
		<!-- Stacked List View -->
		<div>
			<MapsTable maps={data.maps} stops={data.stops} />
		</div>
	</section>

	<Button class="w-full" href="/maps/import" variant="link">New Map</Button>

	<!-- Depots and Drivers Grid -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<!-- Drivers Section -->
		<section>
			<Card.Root class="h-full shadow-lg">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Truck class="h-5 w-5 text-primary" />
						Drivers
					</Card.Title>
					<Card.Description>Manage your delivery drivers</Card.Description>
				</Card.Header>
				<Card.Content>
					<DriversTable
						drivers={data.drivers.filter((e) => {
							return !e.temporary;
						})}
					/>
				</Card.Content>
				<Card.Footer>
					<EditOrCreateDriverPopover mode="create" onSuccess={handleDriverCreated} />
				</Card.Footer>
			</Card.Root>
		</section>
		<section>
			<Card.Root class="h-full shadow-lg">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Building2 class="h-5 w-5 text-primary" />
						Depots
					</Card.Title>
					<Card.Description>Starting locations for your delivery routes</Card.Description>
				</Card.Header>
				<Card.Content>
					<DepotsTable depots={data.depots} />
				</Card.Content>
				<Card.Footer class="h-full">
					<div class="mt-auto">
						<EditOrCreateDepotPopover mode="create" onSuccess={handleDepotCreated} />
					</div>
				</Card.Footer>
			</Card.Root>
		</section>
	</div>
</div>
