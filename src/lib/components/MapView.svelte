<script lang="ts">
	import { env } from '$env/dynamic/public';
	import type {
		DepotWithLocationJoin,
		Driver,
		Route,
		StopWithLocation
	} from '$lib/schemas';
	import { getTextColor } from '$lib/utils';
	import type maplibregl from 'maplibre-gl';
	import { mode } from 'mode-watcher';
	import { Garage, MapPin } from 'phosphor-svelte';
	import { GeoJSON, LineLayer, MapLibre, Marker, Popup } from 'svelte-maplibre';
	import DepotMapPopup from './DepotMapPopup.svelte';
	import StopMapPopup from './StopMapPopup.svelte';

	let {
		stops = [],
		routes = null,
		drivers = [],
		depot = null,
		center = [-98.5795, 39.8283],
		zoom = 4,
		focusedStopId = $bindable(null),
		hiddenDrivers = $bindable([]),
		onGoToStop = (stopId: string) => {}
	}: {
		stops?: StopWithLocation[];
		routes?: Route[] | null;
		drivers?: Driver[];
		depot?: DepotWithLocationJoin | null;
		center?: [number, number];
		zoom?: number;
		focusedStopId?: string | null;
		onGoToStop?: (stopId: string) => void;
		hiddenDrivers?: Driver[];
	} = $props();

	let map: maplibregl.Map | undefined = $state();
	let style = $derived.by(() => {
		return mode.current == 'light'
			? `https://api.maptiler.com/maps/streets-v4/style.json?key=${env.PUBLIC_MAPTILER_KEY}`
			: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${env.PUBLIC_MAPTILER_KEY}`;
	});

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
		if (stops.length === 0 && !depot) return undefined;

		let minLng = Infinity;
		let maxLng = -Infinity;
		let minLat = Infinity;
		let maxLat = -Infinity;

		stops.forEach((item) => {
			if (!item.location.lat || !item.location.lon) return;

			const lat = item.location.lat;
			const lon = item.location.lon;

			if (!isNaN(lat) && !isNaN(lon)) {
				minLng = Math.min(minLng, lon);
				maxLng = Math.max(maxLng, lon);
				minLat = Math.min(minLat, lat);
				maxLat = Math.max(maxLat, lat);
			}
		});

		// Include depot in bounds
		if (depot?.location.lat && depot?.location.lon) {
			minLng = Math.min(minLng, depot.location.lon);
			maxLng = Math.max(maxLng, depot.location.lon);
			minLat = Math.min(minLat, depot.location.lat);
			maxLat = Math.max(maxLat, depot.location.lat);
		}

		if (minLng === Infinity) return undefined;

		return [
			[minLng, minLat],
			[maxLng, maxLat]
		] as [[number, number], [number, number]];
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

<div class="rounded-car h-full w-full">
	<!-- style="https://api.maptiler.com/maps/streets-v2/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL" -->
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
			{#each routes as route, index}
				{#if !hiddenDrivers.find((e) => e.id == route.driver_id)}
					<GeoJSON id={`route-${route.driver_id}`} data={route.geometry}>
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
		{#each stops as item, index}
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
								{stop}
								{location}
								driver={drivers.find((e) => e.id == stop.driver_id)}
								onGoToStop={(stopId) => {
									onGoToStop(stopId);
								}}
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
					<Garage
						weight="fill"
						class="size-7 text-forest-600 dark:text-white"
					/>
				</div>
				<Popup openOn="click" offset={[0, -10]} closeOnClickOutside closeButton>
					<DepotMapPopup {depot} />
				</Popup>
			</Marker>
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
</style>
