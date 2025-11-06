<script lang="ts">
	import MapBoxStaticMap from '$lib/components/MapBoxStaticMap.svelte';
	import * as Actions from '$lib/components/TableActionsDropdown.Items';
	import TableActionsDropdown from '$lib/components/TableActionsDropdown.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import type { Map as MapType, StopWithLocation } from '$lib/schemas';
	import { mapApi } from '$lib/services/api';
	import { formatDate } from '$lib/utils';
	import { Calendar, Check, Map, MapPin, Plus, Truck } from 'lucide-svelte';

	let {
		maps = $bindable(),
		stops
	}: {
		maps: MapType[];
		stops: StopWithLocation[];
	} = $props();

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this map?')) {
			return;
		}

		try {
			await mapApi.delete(id);
			// Remove from local array
			maps = maps.filter((map) => map.id !== id);
		} catch (error) {
			console.error('Failed to delete map:', error);
			alert('Failed to delete map. Please try again.');
		}
	};

	const handleCopyId = (id: string) => {
		navigator.clipboard.writeText(id);
	};

	function getMapStops(mapId: string, stops: StopWithLocation[]) {
		return stops.filter((stopWithLocation) => {
			return stopWithLocation.stop.map_id == mapId;
		});
	}

	function getMapIsRouted(mapId: string, stops: StopWithLocation[]) {
		const mapStops = getMapStops(mapId, stops);

		// If no stops, consider it as not routed
		if (mapStops.length === 0) {
			return false;
		}

		// A map is considered routed if all stops have both driver_id and delivery_index
		const routedStops = mapStops.filter((stopWithLocation) => {
			return (
				stopWithLocation.stop.driver_id !== null && stopWithLocation.stop.delivery_index !== null
			);
		});

		return routedStops.length === mapStops.length;
	}

	function getMapDriverCount(mapId: string, stops: StopWithLocation[]) {
		const mapStops = getMapStops(mapId, stops);
		const uniqueDrivers = new Set(
			mapStops
				.map((stopWithLocation) => stopWithLocation.stop.driver_id)
				.filter((id) => id !== null)
		);
		return uniqueDrivers.size;
	}
</script>

{#if maps.length === 0}
	<Card.Root>
		<Card.Content class="flex flex-col items-center justify-center py-16">
			<Map class="mb-4 h-16 w-16 text-muted-foreground" />
			<h3 class="headline-small mb-2">No Maps Yet</h3>
			<p class="body-medium mb-6 text-center text-muted-foreground">
				Get started by uploading a CSV file with addresses to create your first map.
			</p>
			<Button href="/demo/csv">
				<Plus class="mr-2 h-4 w-4" />
				Upload CSV
			</Button>
		</Card.Content>
	</Card.Root>
{:else}
	<div class="space-y-4">
		{#each maps as map}
			{@const mapStops = getMapStops(map.id, stops)}
			{@const isRouted = getMapIsRouted(map.id, stops)}
			{@const driverCount = getMapDriverCount(map.id, stops)}
			<Card.Root class="py-0">
				<Card.Content class="px-0">
					<div class="">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-0">
							<!-- Map thumbnail - top on mobile, left on small+ -->
							<div class="flex-shrink-0">
								<MapBoxStaticMap mapId={map.id} stops={mapStops} />
							</div>

							<!-- Content wrapper -->
							<div
								class="flex flex-1 flex-row gap-3 p-6 sm:flex-row sm:items-center sm:justify-between"
							>
								<!-- Left side - Main info -->
								<div class="flex-1">
									<div class="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
										<a href="/maps/{map.id}" class="flex items-center gap-2 hover:underline">
											<h3 class="text-lg font-semibold">{map.title}</h3>
										</a>
										{#if isRouted}
											<Badge variant="default" class="w-fit bg-green-200 text-green-800">
												<Check class="mr-1 size-3" />
												Routed
											</Badge>
										{/if}
									</div>

									<!-- Stats row -->
									<div
										class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:gap-6"
									>
										<div class="flex items-center gap-1 whitespace-nowrap">
											<MapPin class="h-4 w-4" />
											<span>{mapStops.length} stops</span>
										</div>
										{#if driverCount > 0}
											<div class="flex items-center gap-1 whitespace-nowrap">
												<Truck class="h-4 w-4" />
												<span>{driverCount} driver{driverCount > 1 ? 's' : ''}</span>
											</div>
										{/if}
										<div class="flex items-center gap-1 whitespace-nowrap">
											<Calendar class="h-4 w-4" />
											<span class="hidden sm:inline">Created </span>
											<span>{formatDate(map.created_at)}</span>
										</div>
									</div>
								</div>

								<!-- Right side - Actions -->
								<div
									class="flex items-center justify-between gap-2 sm:flex sm:flex-shrink-0 sm:justify-end"
								>
									<Button
										href="/maps/{map.id}"
										variant="outline"
										size="sm"
										class="hidden flex-1 sm:block sm:flex-none"
									>
										<span class="sm:hidden">View</span>
										<span class="hidden sm:inline">View Map</span>
									</Button>
									<TableActionsDropdown>
										<Actions.Copy onclick={() => handleCopyId(map.id)} label="Copy ID" />
										<Actions.Delete onclick={() => handleDelete(map.id)} />
										<Actions.MetadataLabel item={map} />
									</TableActionsDropdown>
								</div>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
{/if}
