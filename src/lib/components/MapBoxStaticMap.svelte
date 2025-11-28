<script lang="ts">
	import { PUBLIC_MAPBOX_ACCESS_TOKEN } from '$env/static/public';
	import type { StopWithLocation } from '$lib/schemas';
	import { mode } from 'mode-watcher';

	interface Props {
		stops: StopWithLocation[];
		mapId: string;
		width?: number;
		height?: number;
		style?: string;
		padding?: number;
	}

	let {
		stops,
		mapId,
		width = 600,
		height = 400,

		padding = 20,
		...restProps
	}: Props = $props();

	let style = $derived.by(() => {
		return mode.current == 'light' ? 'streets-v12' : 'dark-v11';
	});

	function getBoundingBox(stops: StopWithLocation[]): [number, number, number, number] {
		if (stops.length === 0) {
			// Default bounding box if no stops
			return [-74.006, 40.7128, -73.9352, 40.7589]; // NYC area
		}

		let minLon = Infinity;
		let minLat = Infinity;
		let maxLon = -Infinity;
		let maxLat = -Infinity;

		for (const stop of stops) {
			if (stop.location.lon && stop.location.lat) {
				const lon = Number(stop.location.lon);
				const lat = Number(stop.location.lat);

				minLon = Math.min(minLon, lon);
				minLat = Math.min(minLat, lat);
				maxLon = Math.max(maxLon, lon);
				maxLat = Math.max(maxLat, lat);
			}
		}

		// Add padding to the bounding box
		const lonPadding = (maxLon - minLon) * 0.4 || 0.01;
		const latPadding = (maxLat - minLat) * 0.4 || 0.01;

		return [minLon - lonPadding, minLat - latPadding, maxLon + lonPadding, maxLat + latPadding];
	}

	function getMapBoxURL(boundingBox: [number, number, number, number], token: string): string {
		// Construct Mapbox Static Images API URL
		const [minLon, minLat, maxLon, maxLat] = boundingBox;

		// Create overlay for stop markers
		const overlays = stops
			.filter((stop) => stop.location.lon && stop.location.lat)
			.map((stop, index) => {
				const lon = Number(stop.location.lon);
				const lat = Number(stop.location.lat);
				const colors = ['013328'];
				const color = colors[index % colors.length];
				return `pin-s+${color}(${lon},${lat})`;
			})
			.join(',');

		// Construct the URL with viewport-appropriate dimensions
		const baseUrl = `https://api.mapbox.com/styles/v1/mapbox/${style}/static`;
		const params = new URLSearchParams({
			access_token: token,
			attribution: 'true'
		});

		// Responsive sizing: wide rectangle for mobile, square for desktop
		// Using @2x resolution for crisp display on high-DPI screens
		const width = 800; // Covers mobile full-width at 2x resolution
		const height = 200; // h-24 (96px) at 2x resolution

		const url = `${baseUrl}/${overlays}/[${minLon},${minLat},${maxLon},${maxLat}]/${width}x${height}@2x?${params.toString()}`;

		return url;
	}

	const boundingBox = $derived(getBoundingBox(stops));
	const mapUrl = $derived(
		PUBLIC_MAPBOX_ACCESS_TOKEN ? getMapBoxURL(boundingBox, PUBLIC_MAPBOX_ACCESS_TOKEN) : ''
	);
</script>

{#if mapUrl}
	<a
		href="/maps/{mapId}"
		class="block h-full overflow-hidden rounded-t-lg sm:rounded-r-none sm:rounded-bl-lg"
	>
		{#if stops.length}
			<img
				src={mapUrl}
				class="h-24 w-full object-cover shadow transition-transform duration-300 hover:scale-110 sm:h-full sm:w-32 md:w-56 lg:w-72"
				alt="Map showing {stops.length} stops"
				{...restProps}
			/>
		{:else}
			<div class="h-24 bg-secondary sm:h-full"></div>
		{/if}
	</a>
{:else}
	<div
		class="flex h-48 w-full items-center justify-center rounded-lg border border-gray-300 bg-gray-100 sm:h-full sm:w-32"
		{...restProps}
	>
		<p class="text-sm text-gray-500">Mapbox token not configured</p>
	</div>
{/if}
