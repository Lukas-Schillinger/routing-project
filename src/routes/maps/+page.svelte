<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import CreateDepotPopover from '$lib/components/CreateDepotPopover.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Plus } from 'lucide-svelte';
	import type { PageData } from './$types';
	import DepotsTable from './DepotsTable.svelte';
	import DriversTable from './DriversTable.svelte';
	import MapsTable from './MapsTable.svelte';

	let { data }: { data: PageData } = $props();

	async function handleDepotCreated() {
		// Invalidate all data to refetch depots from server
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Maps - Routing Project</title>
</svelte:head>

<div class="mx-auto p-6">
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="headline-large mb-2">Maps</h1>
			<p class="body-large text-muted-foreground">Manage your routing maps and delivery routes</p>
		</div>
		<Button href="/demo/csv">
			<Plus class="mr-2 h-4 w-4" />
			New Map
		</Button>
	</div>

	<div class="space-y-8">
		<!-- Maps Section -->
		<section>
			<div class="mb-4">
				<h2 class="headline-medium mb-1">Maps</h2>
				<p class="body-medium text-muted-foreground">Your routing maps and delivery schedules</p>
			</div>
			<MapsTable maps={data.maps} />
		</section>

		<!-- Depots Section -->
		<section>
			<Card.Root>
				<Card.Header>
					<Card.Title>Depots</Card.Title>
					<Card.Description>Starting locations for your delivery routes</Card.Description>
				</Card.Header>
				<Card.Content>
					<DepotsTable depots={data.depots} />
				</Card.Content>
				<Card.Footer>
					<CreateDepotPopover onSuccess={handleDepotCreated} />
				</Card.Footer>
			</Card.Root>
		</section>

		<!-- Drivers Section -->
		<section>
			<Card.Root>
				<Card.Header>
					<Card.Title>Drivers</Card.Title>
					<Card.Description>Manage your delivery drivers</Card.Description>
				</Card.Header>
				<Card.Content>
					<DriversTable drivers={data.drivers} />
				</Card.Content>
				<Card.Footer>
					<Button variant="outline" href="/drivers">
						<Plus class="mr-2 h-4 w-4" />
						Add Driver
					</Button>
				</Card.Footer>
			</Card.Root>
		</section>
	</div>
</div>

<style>
	:global(body) {
		background: linear-gradient(to bottom right, hsl(var(--background)), hsl(var(--muted)));
		min-height: 100vh;
	}
</style>
