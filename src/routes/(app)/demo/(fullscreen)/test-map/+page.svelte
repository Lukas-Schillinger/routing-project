<script lang="ts">
	import { PUBLIC_MAPBOX_ACCESS_TOKEN } from '$env/static/public';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { MapPin, Navigation, User } from 'lucide-svelte';
	import 'mapbox-gl/dist/mapbox-gl.css';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let map: mapboxgl.Map | null = $state(null);
	let mapContainer: HTMLDivElement;
	let mapError = $state<string | null>(null);

	function disableMapDrag() {
		map?.dragPan.disable();
		map?.scrollZoom.disable();
		map?.touchZoomRotate.disable();
	}

	function enableMapDrag() {
		map?.dragPan.enable();
		map?.scrollZoom.enable();
		map?.touchZoomRotate.enable();
	}

	function focusOnDriver(driverId: string) {
		const driverStops = data.stops.filter((s) => s.stop.driver_id === driverId);
		if (driverStops.length === 0 || !map) return;

		const bounds = new mapboxgl.LngLatBounds();
		driverStops.forEach((stop) => {
			if (stop.location.lat && stop.location.lon) {
				bounds.extend([parseFloat(stop.location.lon), parseFloat(stop.location.lat)]);
			}
		});

		map.fitBounds(bounds, { padding: 100, maxZoom: 14 });
	}

	function focusOnStop(stopId: string) {
		const stop = data.stops.find((s) => s.stop.id === stopId);
		if (!stop || !stop.location.lat || !stop.location.lon || !map) return;

		map.flyTo({
			center: [parseFloat(stop.location.lon), parseFloat(stop.location.lat)],
			zoom: 15,
			duration: 1000
		});
	}

	onMount(() => {
		console.log('Mounting map component...');
		console.log('Mapbox token:', PUBLIC_MAPBOX_ACCESS_TOKEN ? 'exists' : 'MISSING');
		console.log('Map container:', mapContainer);
		console.log('Data:', data);

		if (!PUBLIC_MAPBOX_ACCESS_TOKEN) {
			mapError = 'Mapbox token is missing';
			console.error('Mapbox access token is not configured');
			return;
		}

		try {
			mapboxgl.accessToken = PUBLIC_MAPBOX_ACCESS_TOKEN;
			map = new mapboxgl.Map({
				container: mapContainer,
				style: 'mapbox://styles/mapbox/streets-v12',
				center: [-81.95, 28.04],
				zoom: 11
			});

			map.on('load', () => {
				console.log('Map loaded successfully');
				// Add markers for all stops
				data.stops.forEach((stopWithLocation, index) => {
					const { stop, location } = stopWithLocation;
					if (!location.lat || !location.lon) return;

					const lat = parseFloat(location.lat);
					const lon = parseFloat(location.lon);

					// Create marker element
					const el = document.createElement('div');
					el.className = 'custom-marker';
					el.innerHTML = `
					<div class="marker-content">
						<span class="marker-number">${stop.delivery_index || index + 1}</span>
					</div>
				`;

					// Add marker to map
					const marker = new mapboxgl.Marker(el).setLngLat([lon, lat]).addTo(map!);

					// Add popup
					const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
					<div class="p-2">
						<h3 class="font-semibold">${location.name || 'Stop'}</h3>
						<p class="text-sm text-muted-foreground">${location.address_line1}</p>
						${stop.contact_name ? `<p class="text-sm mt-1">${stop.contact_name}</p>` : ''}
						${stop.notes ? `<p class="text-xs text-muted-foreground">${stop.notes}</p>` : ''}
					</div>
				`);

					marker.setPopup(popup);
				});

				// Fit map to show all stops
				if (data.stops.length > 0) {
					const bounds = new mapboxgl.LngLatBounds();
					data.stops.forEach((s) => {
						if (s.location.lat && s.location.lon) {
							bounds.extend([parseFloat(s.location.lon), parseFloat(s.location.lat)]);
						}
					});
					map!.fitBounds(bounds, { padding: 80, maxZoom: 13 });
				}
			});

			map.on('error', (e) => {
				console.error('Map error:', e);
				mapError = 'Map failed to load: ' + e.error.message;
			});
		} catch (error) {
			console.error('Error initializing map:', error);
			mapError =
				'Failed to initialize map: ' + (error instanceof Error ? error.message : String(error));
		}

		return () => {
			console.log('Cleaning up map...');
			map?.remove();
		};
	});
</script>

<svelte:head>
	<title>Test Map - Routing Project</title>
</svelte:head>

<!-- Fixed Map Container -->
<div class="fixed inset-0 z-0">
	<div bind:this={mapContainer} id="map" class="h-full w-full"></div>
</div>

<!-- Error overlay if map fails to load -->
{#if mapError}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
		<div class="text-destructive-foreground max-w-md rounded-lg bg-destructive p-6 shadow-lg">
			<h2 class="mb-2 text-lg font-semibold">Map Error</h2>
			<p class="text-sm">{mapError}</p>
			<Button class="mt-4" onclick={() => window.location.reload()}>Reload Page</Button>
		</div>
	</div>
{/if}

<!-- Gradient to improve contrast under sheet -->
<div
	class="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-black/20 to-transparent"
></div>

<!-- Bottom sheet over map -->
<BottomSheet
	snapsVH={[18, 50, 88]}
	initial={18}
	onDragStart={disableMapDrag}
	onDragEnd={enableMapDrag}
>
	{#snippet header()}
		<div class="px-4 pb-2">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold">Route Overview</h2>
				<Badge variant="secondary">
					<MapPin class="mr-1 h-3 w-3" />
					{data.stops.length} stops
				</Badge>
			</div>
		</div>
	{/snippet}

	{#snippet children()}
		<!-- Drivers Section -->
		<div class="px-4 pb-3">
			<h3 class="mb-3 text-sm font-semibold text-muted-foreground">Drivers</h3>
			<div class="space-y-2">
				{#each data.drivers as driver}
					{@const stopCount = data.driverStopCounts[driver.id] || 0}
					{@const driverStops = data.stops.filter((s) => s.stop.driver_id === driver.id)}
					{@const completedStops = driverStops.filter((s) => s.stop.delivery_index !== null).length}
					{@const progress = stopCount > 0 ? (completedStops / stopCount) * 100 : 0}

					<div class="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm">
						<div
							class="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
						>
							<User class="h-5 w-5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center justify-between gap-2">
								<p class="truncate font-medium">{driver.name}</p>
								<span class="text-xs text-muted-foreground tabular-nums"
									>{stopCount} {stopCount === 1 ? 'stop' : 'stops'}</span
								>
							</div>
							{#if driver.phone}
								<p class="text-xs text-muted-foreground">{driver.phone}</p>
							{/if}
							<div class="mt-2 h-1.5 rounded-full bg-muted">
								<div
									class="h-full rounded-full bg-primary transition-all"
									style="width: {progress}%"
								></div>
							</div>
						</div>
						<Button
							size="sm"
							variant="outline"
							onclick={() => focusOnDriver(driver.id)}
							disabled={stopCount === 0}
						>
							<Navigation class="h-4 w-4" />
						</Button>
					</div>
				{/each}
			</div>
		</div>

		<!-- Stops Section -->
		<div class="border-t px-4 py-3">
			<h3 class="mb-3 text-sm font-semibold text-muted-foreground">All Stops</h3>
			<ul class="space-y-2">
				{#each data.stops as { stop, location }}
					{@const driver = data.drivers.find((d) => d.id === stop.driver_id)}

					<li class="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-sm">
						<div class="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-green-500"></div>
						<div class="min-w-0 flex-1">
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0">
									<p class="truncate font-medium">
										{location.name || location.address_line1}
									</p>
									<p class="text-sm text-muted-foreground">
										{location.address_line1}
										{#if location.city}
											· {location.city}, {location.region}
										{/if}
									</p>
								</div>
								{#if stop.delivery_index}
									<Badge variant="outline" class="flex-shrink-0">#{stop.delivery_index}</Badge>
								{/if}
							</div>
							{#if stop.contact_name || stop.notes}
								<div class="mt-1 text-xs text-muted-foreground">
									{#if stop.contact_name}
										<span>{stop.contact_name}</span>
									{/if}
									{#if stop.notes}
										<span class="ml-2">· {stop.notes}</span>
									{/if}
								</div>
							{/if}
							{#if driver}
								<div class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
									<User class="h-3 w-3" />
									<span>{driver.name}</span>
								</div>
							{/if}
						</div>
						<Button size="sm" variant="ghost" onclick={() => focusOnStop(stop.id)}>
							<MapPin class="h-4 w-4" />
						</Button>
					</li>
				{/each}
			</ul>
		</div>
	{/snippet}
</BottomSheet>

<style>
	#map {
		width: 100%;
		height: 100%;
	}

	:global(html),
	:global(body) {
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
		overflow: hidden;
	}

	:global(.custom-marker) {
		cursor: pointer;
	}

	:global(.custom-marker:hover) {
		transform: scale(1.1);
		z-index: 10;
	}

	:global(.marker-content) {
		width: 28px;
		height: 28px;
		background: hsl(var(--primary));
		border: 3px solid white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.3),
			0 0 0 2px hsl(var(--primary) / 0.3);
		transition: all 0.2s ease;
		position: relative;
	}

	:global(.marker-content::before) {
		content: '';
		position: absolute;
		inset: -6px;
		border-radius: 50%;
		border: 2px solid hsl(var(--primary) / 0.4);
		pointer-events: none;
	}

	:global(.custom-marker:hover .marker-content) {
		transform: scale(1.15);
		box-shadow:
			0 4px 12px rgba(0, 0, 0, 0.4),
			0 0 0 3px hsl(var(--primary) / 0.4);
	}

	:global(.custom-marker:hover .marker-content::before) {
		border-color: hsl(var(--primary) / 0.6);
		border-width: 2.5px;
	}

	:global(.marker-number) {
		color: white;
		font-weight: 700;
		font-size: 10px;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
		position: relative;
		z-index: 1;
	}
</style>
