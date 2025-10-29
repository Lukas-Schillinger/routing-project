<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import EditOrCreateDepotPopover from '$lib/components/EditOrCreateDepotPopover.svelte';
	import EditOrCreateDriverPopover from '$lib/components/EditOrCreateDriverPopover.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Building2, Plus, Truck } from 'lucide-svelte';
	import { getContext } from 'svelte';
	import type { PageData } from './$types';
	import DepotsTable from './DepotsTable.svelte';
	import DriversTable from './DriversTable.svelte';
	import MapsTable from './MapsTable.svelte';

	let { data }: { data: PageData } = $props();

	// Set page header in layout context
	const pageHeaderContext = getContext<{ set: (header: any) => void }>(
		'pageHeader'
	);
	pageHeaderContext.set({
		title: 'Maps',
		description: 'Manage your routing maps and delivery routes'
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
	<!-- Header Card -->
	<Card.Card class="shadow-lg">
		<Card.CardHeader>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-muted-foreground">
						Create and manage your route maps
					</p>
				</div>
				<Button href="/demo/csv">
					<Plus class="mr-2 h-4 w-4" />
					New Map
				</Button>
			</div>
		</Card.CardHeader>
	</Card.Card>

	<!-- Maps Section -->
	<section>
		<MapsTable maps={data.maps} />
	</section>

	<!-- Depots and Drivers Grid -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<!-- Drivers Section -->
		<section>
			<Card.Root class="shadow-lg">
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
					<EditOrCreateDriverPopover
						mode="create"
						onSuccess={handleDriverCreated}
					/>
				</Card.Footer>
			</Card.Root>
		</section>
		<section>
			<Card.Root class="shadow-lg">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Building2 class="h-5 w-5 text-primary" />
						Depots
					</Card.Title>
					<Card.Description
						>Starting locations for your delivery routes</Card.Description
					>
				</Card.Header>
				<Card.Content>
					<DepotsTable depots={data.depots} />
				</Card.Content>
				<Card.Footer>
					<EditOrCreateDepotPopover
						mode="create"
						onSuccess={handleDepotCreated}
					/>
				</Card.Footer>
			</Card.Root>
		</section>
	</div>
</div>
