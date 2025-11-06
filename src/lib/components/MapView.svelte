<script lang="ts">
	import type { Route, StopWithLocation } from '$lib/schemas';
	import { MapPin } from 'lucide-svelte';
	import type maplibregl from 'maplibre-gl';
	import { mode } from 'mode-watcher';
	import { onMount } from 'svelte';
	import { LineLayer, MapLibre, Marker, Popup } from 'svelte-maplibre';
	import GeoJSON from 'svelte-maplibre/GeoJSON.svelte';
	import StopMapPopup from './StopMapPopup.svelte';
	import * as avatarStyle from '@dicebear/identicon'
	import { createAvatar } from '@dicebear/core';

	let {
		stops = [],
		routes = null,
		center = [-98.5795, 39.8283],
		zoom = 4,
		focusedStopId = $bindable(null),
		onGoToStop = (stopId: string) => {}
	}: {
		stops?: StopWithLocation[];
		routes?: Route[] | null;
		center?: [number, number];
		zoom?: number;
		focusedStopId?: string | null;
		onGoToStop?: (stopId: string) => void;
	} = $props();

	let map: maplibregl.Map | undefined = $state();
	let style = $derived.by(() => {
		return mode.current == 'light'
			? 'https://api.maptiler.com/maps/streets-v4/style.json?key=L2oyusC7bBTlsWRPZFQh'
			: 'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=L2oyusC7bBTlsWRPZFQh';
	});

	onMount(() => {
		console.log('MOUNTED', new Date().toLocaleTimeString());
	});

	function getAvatar(driverId: string) {
		return createAvatar(avatarStyle, {
			seed: driverId
		}).toDataUri();
	}

	// Color palette for driver routes
	const driverColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

	// Calculate bounds from stops for initial view
	const bounds = $derived.by(() => {
		if (stops.length === 0) return undefined;

		let minLng = Infinity;
		let maxLng = -Infinity;
		let minLat = Infinity;
		let maxLat = -Infinity;

		stops.forEach((item) => {
			if (!item.location.lat || !item.location.lon) return;

			const lat = parseFloat(item.location.lat);
			const lon = parseFloat(item.location.lon);

			if (!isNaN(lat) && !isNaN(lon)) {
				minLng = Math.min(minLng, lon);
				maxLng = Math.max(maxLng, lon);
				minLat = Math.min(minLat, lat);
				maxLat = Math.max(maxLat, lat);
			}
		});

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

			const lat = parseFloat(stop.location.lat);
			const lon = parseFloat(stop.location.lon);

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

<div class="h-full w-full rounded-xl">
	<!-- style="https://api.maptiler.com/maps/streets-v2/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL" -->
	<MapLibre
		{center}
		{style}
		{zoom}
		{bounds}
		fitBoundsOptions={{ padding: 80, maxZoom: 15 }}
		class="h-full w-full rounded-xl"
		bind:map
	>
		<!-- Route lines -->
		{#if routes && routes.length > 0}
			{#each routes as route, index}
				<GeoJSON id={`route-${route.driver_id}`} data={route.geometry}>
					<LineLayer
						paint={{
							'line-color': driverColors[index % driverColors.length],
							'line-width': 4,
							'line-opacity': 0.7
						}}
						layout={{
							'line-cap': 'round',
							'line-join': 'round'
						}}
					/>
				</GeoJSON>
			{/each}
		{/if}

		<!-- Stop markers -->
		{#each stops as item, index}
			{@const { stop, location } = item}
			{#if location.lat && location.lon}
				{@const lat = parseFloat(location.lat)}
				{@const lon = parseFloat(location.lon)}
				{#if !isNaN(lat) && !isNaN(lon)}
					<Marker lngLat={[lon, lat]} class=" cursor-pointer">
						{#if stop.delivery_index}
							<div class="top-24">
								<MapPin class="relative right-1.5 size-10 fill-primary" />
								<div
									class="relative -top-[38px] flex size-7 items-center justify-center rounded-full border-3 border-white bg-emerald-700 shadow-lg transition-all duration-50 hover:scale-[1.15] hover:shadow-xl"
								>
									<span class="relative z-[1] text-[10px] font-bold text-white drop-shadow"
										>{stop.delivery_index ? stop.delivery_index : ''}</span
									>
								</div>
							</div>
						{:else}
							<MapPin class="relative top-10 right-1.5 size-10 fill-primary" />
							<div
								class="relative flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-white bg-emerald-700 shadow-lg transition-all duration-50 before:pointer-events-none before:absolute before:inset-[-6px] before:rounded-full before:border-2 before:border-emerald-700/60 before:content-[''] hover:scale-[1.15] hover:shadow-xl hover:before:border-[1.5px] hover:before:border-emerald-700/40"
							>
								<span class="relative z-[1] text-[10px] font-bold text-white drop-shadow"
									>{stop.delivery_index ? stop.delivery_index : ''}</span
								>
							</div>
						{/if}

						<Popup openOn="click" offset={[0, -15]} closeOnClickOutside closeButton>
							<StopMapPopup
								{stop}
								{location}
								{index}
								onGoToStop={(stopId) => {
									onGoToStop(stopId);
								}}
							/>
						</Popup>
					</Marker>
				{/if}
			{/if}
		{/each}
	</MapLibre>
</div>

<style lang="postcss">
	@reference "tailwindcss";

	:global(.maplibregl-popup-content) {
		@apply rounded-lg border bg-white;
	}

	:global(.dark .maplibregl-popup-content) {
		background-color: oklch(0.205 0 0);
		@apply border border-gray-900;
	}
</style>
