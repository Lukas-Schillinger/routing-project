<script lang="ts">
	import { env } from '$env/dynamic/public';
	import type {
		DepotWithLocationJoin,
		Driver,
		LocationCreate,
		Route,
		StopWithLocation
	} from '$lib/schemas';
	import { geocodingApi } from '$lib/services/api';
	import { geocodingFeatureToLocation, getTextColor } from '$lib/utils';
	import type maplibregl from 'maplibre-gl';
	import { mode } from 'mode-watcher';
	import Warehouse from '@lucide/svelte/icons/warehouse';
	import { MapPin } from 'phosphor-svelte';
	import type { Snippet } from 'svelte';
	import { GeoJSON, LineLayer, MapLibre, Marker, Popup } from 'svelte-maplibre';
	import DepotMapPopup from './DepotMapPopup.svelte';
	import MapToolbar from './MapToolbar.svelte';
	import StopMapPopup from './StopMapPopup.svelte';
	import TempPinMarker from './TempPinMarker.svelte';

	let {
		stops = [],
		routes = null,
		drivers = [],
		assignedDrivers = [],
		depot = null,
		center = [-98.5795, 39.8283],
		zoom = 4,
		focusedStopId = $bindable(null),
		hiddenDrivers = $bindable([]),
		showToolbar = false,
		toolbarMode = $bindable<'default' | 'drop-pin'>('default'),
		toolbarLayoutControls,
		mapId,
		onStopCreated,
		onStopUpdated,
		onStopDeleted
	}: {
		stops?: StopWithLocation[];
		routes?: Route[] | null;
		drivers?: Driver[];
		assignedDrivers?: Driver[];
		depot?: DepotWithLocationJoin | null;
		center?: [number, number];
		zoom?: number;
		focusedStopId?: string | null;
		hiddenDrivers?: Driver[];
		showToolbar?: boolean;
		toolbarMode?: 'default' | 'drop-pin';
		toolbarLayoutControls?: Snippet;
		mapId?: string;
		onStopCreated?: (stop: StopWithLocation) => void;
		onStopUpdated?: (stop: StopWithLocation) => void;
		onStopDeleted?: () => void;
	} = $props();

	let map: maplibregl.Map | undefined = $state();
	let style = $derived.by(() => {
		return mode.current == 'light'
			? `https://api.maptiler.com/maps/streets-v4/style.json?key=${env.PUBLIC_MAPTILER_KEY}`
			: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${env.PUBLIC_MAPTILER_KEY}`;
	});

	// Temporary pin state for drop-pin mode
	let tempPin = $state<{
		lngLat: [number, number];
		location: LocationCreate | null;
		isLoading: boolean;
	} | null>(null);

	// Handle address selection from toolbar search
	function handleAddressSelect(
		location: LocationCreate,
		lngLat: [number, number]
	) {
		tempPin = { lngLat, location, isLoading: false };

		// Fly to the selected location
		map?.flyTo({
			center: lngLat,
			zoom: 15,
			duration: 1000
		});
	}

	// Handle map click in drop-pin mode
	async function handleMapClick(e: maplibregl.MapMouseEvent) {
		if (toolbarMode !== 'drop-pin') return;

		const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];

		// Set temp pin with loading state
		tempPin = { lngLat, location: null, isLoading: true };

		// Reverse geocode to get address
		try {
			const feature = await geocodingApi.reverse(lngLat[0], lngLat[1]);
			if (feature) {
				const location = geocodingFeatureToLocation(feature);
				tempPin = { lngLat, location, isLoading: false };
			} else {
				tempPin = { lngLat, location: null, isLoading: false };
			}
		} catch (error) {
			console.error('Reverse geocoding failed:', error);
			tempPin = { lngLat, location: null, isLoading: false };
		}
	}

	// Handle stop creation success
	function handleStopCreated(stop: StopWithLocation) {
		tempPin = null;
		toolbarMode = 'default';
		onStopCreated?.(stop);
	}

	// Handle temp pin deletion
	function handleTempPinDelete() {
		tempPin = null;
	}

	// Track current map center for address search proximity bias
	let mapCenter = $state<[number, number] | undefined>(undefined);

	function getDriverColorById(driverId: string, drivers: Driver[]): string {
		const routeDriverId = driverId;
		const matchingDriver = drivers.find((e) => e.id == routeDriverId);
		if (matchingDriver) return matchingDriver.color;

		if (mode.current == 'light') {
			return '#60A5FA';
		} else return '#ffffff';
	}

	// Calculate bounds from stops and depot for initial view
	const bounds = $derived.by(() => {
		const coordinates: { lat: number; lon: number }[] = [];

		for (const item of stops) {
			const { lat, lon } = item.location;
			if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
				coordinates.push({ lat, lon });
			}
		}

		if (depot?.location.lat != null && depot?.location.lon != null) {
			coordinates.push({ lat: depot.location.lat, lon: depot.location.lon });
		}

		if (coordinates.length === 0) return undefined;

		const lons = coordinates.map((c) => c.lon);
		const lats = coordinates.map((c) => c.lat);

		return [
			[Math.min(...lons), Math.min(...lats)],
			[Math.max(...lons), Math.max(...lats)]
		] as [[number, number], [number, number]];
	});

	// Clear temp pin when exiting drop-pin mode
	$effect(() => {
		if (toolbarMode !== 'drop-pin') {
			tempPin = null;
		}
	});

	// Update map center for proximity bias when map moves
	$effect(() => {
		if (!map) return;

		const currentMap = map;
		const updateCenter = () => {
			const center = currentMap.getCenter();
			mapCenter = [center.lng, center.lat];
		};

		// Set initial center
		updateCenter();

		// Listen for map movements
		currentMap.on('moveend', updateCenter);

		return () => {
			currentMap.off('moveend', updateCenter);
		};
	});

	// Bind map click handler for drop-pin mode
	$effect(() => {
		if (!map) return;

		const currentMap = map;
		currentMap.on('click', handleMapClick);

		return () => {
			currentMap.off('click', handleMapClick);
		};
	});

	// Watch for focusedStopId changes and fly to the stop
	$effect(() => {
		if (focusedStopId && map) {
			const stop = stops.find((s) => s.stop.id === focusedStopId);
			if (!stop || !stop.location.lat || !stop.location.lon) return;

			const lat = stop.location.lat;
			const lon = stop.location.lon;

			if (!isNaN(lat) && !isNaN(lon)) {
				map.flyTo({
					center: [lon, lat],
					zoom: 15,
					duration: 1000
				});
			}

			// Reset focusedStopId after flying
			focusedStopId = null;
		}
	});
</script>

<div
	class="rounded-car relative h-full w-full"
	class:drop-pin-mode={toolbarMode === 'drop-pin'}
>
	{#if showToolbar}
		<MapToolbar
			bind:mode={toolbarMode}
			layoutControls={toolbarLayoutControls}
			onAddressSelect={mapId ? handleAddressSelect : undefined}
			proximity={mapCenter}
		/>
	{/if}

	<MapLibre
		{center}
		{style}
		{zoom}
		{bounds}
		fitBoundsOptions={{ padding: 80, maxZoom: 15 }}
		class="h-full w-full rounded-lg"
		bind:map
	>
		<!-- Route lines -->
		{#if routes && routes.length > 0}
			{#each routes.filter((r) => r.geometry) as route (route.id)}
				{#if !hiddenDrivers.find((e) => e.id == route.driver_id)}
					<!-- I don't know how this works -->
					<!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
					{@const data = route.geometry as any}
					<GeoJSON id={`route-${route.driver_id}`} {data}>
						<LineLayer
							paint={{
								'line-color': getDriverColorById(route.driver_id, drivers),
								'line-width': 4,
								'line-opacity': 0.7
							}}
							layout={{
								'line-cap': 'round',
								'line-join': 'round'
							}}
						/>
					</GeoJSON>
				{/if}
			{/each}
		{/if}

		<!-- Stop markers -->
		{#each stops as item (item.stop.id)}
			{@const { stop, location } = item}
			{#if location.lat && location.lon && !hiddenDrivers.find((e) => e.id == stop.driver_id)}
				{@const lat = location.lat}
				{@const lon = location.lon}
				{#if !isNaN(lat) && !isNaN(lon)}
					<Marker lngLat={[lon, lat]} class=" cursor-pointer">
						{#if stop.delivery_index && stop.driver_id}
							{@const color = getDriverColorById(stop.driver_id, drivers)}
							<div
								class="relative transition-transform duration-100 hover:scale-110"
							>
								<MapPin class="size-8" style="fill: {color}" weight="fill" />
								<div
									class="absolute top-1 left-1/2 flex size-5 -translate-x-1/2 items-center justify-center rounded-full"
									style="background-color: {color};"
								>
									<span
										class="text-xs font-bold"
										style="color: {getTextColor(color)};"
									>
										{stop.delivery_index}
									</span>
								</div>
							</div>
						{:else}
							<MapPin
								weight="fill"
								class="relative right-1.5 size-6 fill-forest-600 duration-100 hover:scale-125 dark:fill-white"
							/>
						{/if}

						<Popup
							openOn="click"
							offset={[0, -15]}
							closeOnClickOutside
							closeButton
						>
							<StopMapPopup
								stop={item}
								{stops}
								drivers={assignedDrivers}
								onUpdate={onStopUpdated}
								onDelete={onStopDeleted}
							/>
						</Popup>
					</Marker>
				{/if}
			{/if}
		{/each}

		<!-- Depot marker -->
		{#if depot?.location.lat && depot?.location.lon}
			<Marker
				lngLat={[depot.location.lon, depot.location.lat]}
				class="cursor-pointer"
			>
				<div class="transition-transform duration-100 hover:scale-110">
					<Warehouse class="size-7 text-forest-600 dark:text-white" />
				</div>
				<Popup openOn="click" offset={[0, -10]} closeOnClickOutside closeButton>
					<DepotMapPopup {depot} />
				</Popup>
			</Marker>
		{/if}

		<!-- Temporary pin for creating new stops -->
		{#if tempPin && mapId}
			<TempPinMarker
				{mapId}
				lngLat={tempPin.lngLat}
				location={tempPin.location}
				isLoading={tempPin.isLoading}
				onCreateSuccess={handleStopCreated}
				onDelete={handleTempPinDelete}
			/>
		{/if}
	</MapLibre>
</div>

<style lang="postcss">
	@reference "tailwindcss";

	:global(.maplibregl-popup-content) {
		@apply rounded-lg border bg-white;
	}

	:global(.dark .maplibregl-popup-content) {
		background-color: oklch(0.205 0 0);
		border: 1px solid var(--border);
	}

	/* Override MapLibre canvas cursor in drop-pin mode */
	.drop-pin-mode :global(.maplibregl-canvas) {
		cursor: crosshair !important;
	}
</style>
