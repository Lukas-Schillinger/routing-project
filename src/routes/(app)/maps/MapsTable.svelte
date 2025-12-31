<script lang="ts">
	import DateTimePopover from '$lib/components/DateTimePopover.svelte';
	import MapBoxStaticMap from '$lib/components/MapBoxStaticMap.svelte';
	import * as Actions from '$lib/components/TableActionsDropdown.Items';
	import TableActionsDropdown from '$lib/components/TableActionsDropdown.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import * as Card from '$lib/components/ui/card';
	import * as Empty from '$lib/components/ui/empty';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { Map as MapType, StopWithLocation } from '$lib/schemas';
	import { mapApi } from '$lib/services/api';
	import { formatDate } from '$lib/utils';
	import {
		Calendar,
		ChevronLeft,
		ChevronRight,
		Map,
		MapPin,
		Plus,
		Route,
		Truck
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { MediaQuery } from 'svelte/reactivity';

	let {
		maps = $bindable(),
		stops
	}: {
		maps: MapType[];
		stops: StopWithLocation[];
	} = $props();

	let currentPage = $state(1);
	const pageSize = $derived(new MediaQuery('(min-width: 640px)').current ? 10 : 4);

	const totalPages = $derived(Math.ceil(maps.length / pageSize));
	const paginatedMaps = $derived(maps.slice((currentPage - 1) * pageSize, currentPage * pageSize));

	// Reset to page 1 if maps change and current page is out of bounds
	$effect(() => {
		if (currentPage > totalPages && totalPages > 0) {
			currentPage = totalPages;
		}
	});

	function goToPreviousPage() {
		if (currentPage > 1) {
			currentPage--;
		}
	}

	function goToNextPage() {
		if (currentPage < totalPages) {
			currentPage++;
		}
	}

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this map?')) {
			return;
		}

		try {
			await mapApi.delete(id);
			// Remove from local array
			maps = maps.filter((map) => map.id !== id);
			toast.success('Map deleted');
		} catch (error) {
			toast.error('Error deleting map', {
				description: error instanceof Error ? error.message : 'unknown error'
			});
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

<ButtonGroup.Root>
	<Input placeholder="Search..." />
	<Button variant="secondary" aria-label="Search">
		<Plus /> New Map
	</Button>
</ButtonGroup.Root>

{#if maps.length === 0}
	<Card.Root>
		<Card.Content class="flex flex-col items-center justify-center">
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon">
						<Map />
					</Empty.Media>
					<Empty.Title>No maps yet</Empty.Title>
					<Empty.Description>
						Get started by uploading a CSV file with addresses to create your first map.
					</Empty.Description>
				</Empty.Header>
				<Empty.Content>
					<Button href="/maps/import">create map</Button>
				</Empty.Content>
			</Empty.Root>
		</Card.Content>
	</Card.Root>
{:else}
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
		{#each paginatedMaps as map}
			{@const mapStops = getMapStops(map.id, stops)}
			{@const isRouted = getMapIsRouted(map.id, stops)}
			{@const driverCount = getMapDriverCount(map.id, stops)}
			<Card.Root class="flex flex-col py-0">
				<Card.Content class="flex flex-1 flex-col px-0">
					<div class="flex flex-1 flex-col">
						<div class="flex flex-1 flex-col gap-0 sm:flex-row sm:items-stretch">
							<!-- Map thumbnail - top on mobile, left on small+ -->
							<div class=" flex-shrink-0 sm:w-1/3">
								<MapBoxStaticMap mapId={map.id} stops={mapStops} />
							</div>

							<!-- Content wrapper -->
							<div
								class="flex flex-1 flex-row gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
							>
								<!-- Left side - Main info -->
								<div class="flex-1">
									<div class="flex justify-between gap-2">
										<div class="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
											<a href="/maps/{map.id}" class="flex items-center gap-2 hover:underline">
												<h3 class=" line-clamp-1 font-semibold">{map.title}</h3>
											</a>
										</div>
										<div class="">
											<TableActionsDropdown>
												<Actions.Copy onclick={() => handleCopyId(map.id)} label="Copy ID" />
												<Actions.Delete onclick={() => handleDelete(map.id)} />
												<Actions.MetadataLabel item={map} />
											</TableActionsDropdown>
										</div>
									</div>

									<!-- Stats row -->
									<div
										class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:gap-x-3"
									>
										{#if isRouted}
											<Badge class="gap-2">
												<Route class="h-4 w-4" />
												routed
											</Badge>
										{:else}
											<Badge class="gap-2 bg-secondary text-secondary-foreground">no route</Badge>
										{/if}
										<div class="flex items-center gap-1 whitespace-nowrap">
											<MapPin class="h-4 w-4" />
											<span>{mapStops.length} stops</span>
										</div>
										<div class="flex items-center gap-1 whitespace-nowrap">
											<Truck class="h-4 w-4" />
											<span
												>{driverCount} driver{driverCount > 1 || driverCount == 0 ? 's' : ''}</span
											>
										</div>
										<DateTimePopover item={map}>
											<div class="flex items-center gap-1 whitespace-nowrap">
												<Calendar class="h-4 w-4" />
												<span class="hidden sm:inline"></span>
												<span>{formatDate(map.created_at)}</span>
											</div>
										</DateTimePopover>
									</div>
								</div>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<!-- Pagination controls -->
	{#if totalPages > 1}
		<div class="mt-6 flex items-center justify-between">
			<div class="flex w-full items-center justify-center gap-2">
				<Button
					class="grow sm:grow-0"
					variant="outline"
					size="icon"
					onclick={goToPreviousPage}
					disabled={currentPage === 1}
				>
					<ChevronLeft class="h-4 w-4" />
				</Button>
				<span class="text-sm whitespace-nowrap tabular-nums">
					Page {currentPage} of {totalPages}
				</span>
				<Button
					class="grow sm:grow-0"
					variant="outline"
					size="icon"
					onclick={goToNextPage}
					disabled={currentPage === totalPages}
				>
					<ChevronRight class="h-4 w-4" />
				</Button>
			</div>
		</div>
	{/if}
{/if}
