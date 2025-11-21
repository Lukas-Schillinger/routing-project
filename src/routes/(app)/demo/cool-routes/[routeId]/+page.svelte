<!-- @component This work in browser but doen't work in the iphone simulator
	Uses scroll snap to snap panels across map display. For some reason it won't 
	scroll on mobile. I think it has something to do with pointer-events. 
-->
<script lang="ts">
	import MapView from '$lib/components/MapView.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Clock, Navigation, Route } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let detailExpand = $state(false);

	// Destructure the data
	const { map, stops, assignedDrivers, route } = data;

	// Calculate map center from stops
	const mapCenter = $derived.by(() => {
		if (stops.length === 0) return [-98.5795, 39.8283] as [number, number];

		let totalLat = 0;
		let totalLon = 0;
		let validCount = 0;

		stops.forEach((stop) => {
			if (stop.location.lat && stop.location.lon) {
				totalLat += parseFloat(stop.location.lat);
				totalLon += parseFloat(stop.location.lon);
				validCount++;
			}
		});

		if (validCount === 0) return [-98.5795, 39.8283] as [number, number];

		return [totalLon / validCount, totalLat / validCount] as [number, number];
	});

	// Calculate route statistics
	const routeStats = $derived.by(() => {
		const totalStops = stops.length;
		const totalDrivers = assignedDrivers.length;
		const totalDuration = Number(route.duration);

		return {
			totalStops,
			totalDrivers,
			totalDuration: Math.floor(totalDuration / 60), // Convert to minutes
			avgStopsPerDriver: totalDrivers > 0 ? Math.round(totalStops / totalDrivers) : 0
		};
	});

	// State for focused stop
	let focusedStopId = $state<string | null>(null);

	// Function to handle going to a specific stop
	function handleGoToStop(stopId: string) {
		focusedStopId = stopId;
	}
</script>

<svelte:head>
	<title>{map.title} - Route View | Routing Project</title>
	<meta name="description" content="View optimized routes for {map.title}" />
</svelte:head>
<div class="absolute inset-0 z-0 h-svh w-screen">
	<MapView
		{stops}
		routes={[route]}
		center={mapCenter}
		zoom={12}
		bind:focusedStopId
		onGoToStop={handleGoToStop}
	/>
</div>
<div class="pointer-events-none absolute inset-0 z-10 flex flex-col">
	<!-- Main Content -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Side Panel - Route Summary -->
		<div
			class="h-screen w-80 flex-shrink-0 overflow-clip duration-100 {detailExpand
				? 'translate-y-8/12'
				: 'translate-y-0'}"
		>
			<div class="h-svh snap-y snap-mandatory overflow-scroll pb-6 pl-4">
				<!-- Route Summary Card -->
				<div class="pointer-events-none h-[60vh] bg-forest-600 opacity-40">fake card</div>
				<Card.Root class="pointer-events-auto h-[40vh] snap-end ">
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<Navigation class="h-4 w-4" />
							Route Summary
						</Card.Title>
						<Card.Description>Optimized delivery routes</Card.Description>
					</Card.Header>
					<Card.Content class="pointer-events-auto space-y-4">
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div class="text-center">
								<div class="text-2xl font-bold">{routeStats.totalDrivers}</div>
								<div class="text-muted-foreground">Drivers</div>
							</div>
							<div class="text-center">
								<div class="text-2xl font-bold">{routeStats.totalStops}</div>
								<div class="text-muted-foreground">Stops</div>
							</div>
							<div class="text-center">
								<div class="text-2xl font-bold">{routeStats.totalDuration}</div>
								<div class="text-muted-foreground">Minutes</div>
							</div>
							<div class="text-center">
								<div class="text-2xl font-bold">{routeStats.avgStopsPerDriver}</div>
								<div class="text-muted-foreground">Avg/Driver</div>
							</div>
						</div>
					</Card.Content>
					<Card.Footer>
						<Button onclick={() => (detailExpand = !detailExpand)}>Expand</Button>
					</Card.Footer>
				</Card.Root>

				<!-- Driver Routes List -->
				{#each assignedDrivers as driver}
					{@const driverStops = stops.filter((s) => s.stop.driver_id === driver.id)}
					{@const driverRoute = route}

					{#if driverStops.length > 0}
						<Card.Root class="pointer pointer-events-auto h-3/5 snap-start">
							<Card.Header class="pb-3">
								<div class="flex items-center justify-between">
									<Card.Title class="text-base">{driver.name}</Card.Title>
									<Badge variant="outline" class="text-xs">
										{driverStops.length} stops
									</Badge>
								</div>
								{#if driverRoute}
									<Card.Description class="flex items-center gap-2">
										<Clock class="h-3 w-3" />
										{Math.floor(Number(driverRoute.duration) / 60)} minutes
									</Card.Description>
								{/if}
							</Card.Header>
							<Card.Content class="overflow-scroll pt-0">
								<div class="space-y-3">
									{#each driverStops.sort((a, b) => (a.stop.delivery_index || 0) - (b.stop.delivery_index || 0)) as stop, index}
										<button
											onclick={() => handleGoToStop(stop.stop.id)}
											class="w-full rounded-md text-left text-xs hover:bg-muted"
										>
											<div class="flex items-start gap-2">
												<div
													class="flex h-5 w-5 items-center justify-center rounded-full border border-primary text-xs font-medium text-primary"
												>
													{stop.stop.delivery_index || index + 1}
												</div>
												<div class="min-w-0 flex-1">
													<div class="font-medium">
														{stop.stop.contact_name || 'No contact name'}
													</div>
													<div class="truncate text-muted-foreground">
														{stop.location.address_line_1}
													</div>
												</div>
											</div>
										</button>
									{/each}
								</div>
							</Card.Content>
							<Card.Footer>Down</Card.Footer>
						</Card.Root>
					{/if}
				{/each}

				<!-- Empty State -->
				{#if stops.length === 0}
					<Card.Root>
						<Card.Content class="flex flex-col items-center justify-center py-8">
							<Route class="mb-3 h-12 w-12 text-muted-foreground" />
							<h3 class="mb-1 font-medium">No Routes Found</h3>
							<p class="text-center text-sm text-muted-foreground">
								This map doesn't have any optimized routes yet.
							</p>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		</div>
	</div>
</div>
