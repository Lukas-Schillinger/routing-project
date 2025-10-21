<script lang="ts">
	import { PUBLIC_MAPBOX_ACCESS_TOKEN } from '$env/static/public';
	import type { StopWithLocation } from '$lib/schemas';
	import mapboxgl from 'mapbox-gl';
	import 'mapbox-gl/dist/mapbox-gl.css';
	import { onMount } from 'svelte';

	interface Route {
		id: string;
		coordinates: [number, number][];
		color: string;
	}

	let {
		stops = [],
		routes = [],
		center = [-98.5795, 39.8283],
		zoom = 4
	}: {
		stops?: StopWithLocation[];
		routes?: Route[];
		center?: [number, number];
		zoom?: number;
	} = $props();

	let mapContainer: HTMLDivElement;
	let map: mapboxgl.Map;

	onMount(() => {
		// Initialize map
		map = new mapboxgl.Map({
			container: mapContainer,
			accessToken: PUBLIC_MAPBOX_ACCESS_TOKEN,
			style: 'mapbox://styles/mapbox/streets-v12',
			center: center,
			zoom: zoom
		});

		// Add navigation controls
		map.addControl(new mapboxgl.NavigationControl(), 'top-right');
		map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

		map.on('load', () => {
			// Add stops as markers
			addStopMarkers();

			// Add routes as lines
			addRoutes();

			// Fit map to show all points
			if (stops.length > 0) {
				fitMapToStops();
			}
		});

		return () => {
			map.remove();
		};
	});

	function addStopMarkers() {
		stops.forEach((item, index) => {
			const { stop, location } = item;

			// Skip if coordinates are null or invalid
			if (!location.lat || !location.lon) {
				console.warn(`Missing coordinates for stop ${stop.id}`);
				return;
			}

			const lat = parseFloat(location.lat);
			const lon = parseFloat(location.lon);

			if (isNaN(lat) || isNaN(lon)) {
				console.warn(`Invalid coordinates for stop ${stop.id}`);
				return;
			}

			// Create custom marker element
			const el = document.createElement('div');
			el.className = 'custom-marker';
			el.innerHTML = `
				<div class="marker-content">
					<span class="marker-number">${index + 1}</span>
				</div>
			`;

			// Create popup content
			const popupContent = `
				<div class="map-popup">
					<h3 class="font-semibold text-sm mb-1">${stop.contact_name || 'Unknown'}</h3>
					<p class="text-xs text-gray-600 mb-1">${location.address_line1}</p>
					${location.city ? `<p class="text-xs text-gray-600 mb-1">${location.city}, ${location.region || ''} ${location.postal_code || ''}</p>` : ''}
					${stop.contact_phone ? `<p class="text-xs mt-2">📞 ${stop.contact_phone}</p>` : ''}
					${stop.notes ? `<p class="text-xs mt-2 italic text-gray-500">${stop.notes}</p>` : ''}
				</div>
			`;

			// Create popup
			const popup = new mapboxgl.Popup({
				offset: 25,
				maxWidth: '300px'
			}).setHTML(popupContent);

			// Add marker to map
			new mapboxgl.Marker(el).setLngLat([lon, lat]).setPopup(popup).addTo(map);
		});
	}

	function addRoutes() {
		routes.forEach((route) => {
			// Add route line
			map.addSource(`route-${route.id}`, {
				type: 'geojson',
				data: {
					type: 'Feature',
					properties: {},
					geometry: {
						type: 'LineString',
						coordinates: route.coordinates
					}
				}
			});

			map.addLayer({
				id: `route-${route.id}`,
				type: 'line',
				source: `route-${route.id}`,
				layout: {
					'line-join': 'round',
					'line-cap': 'round'
				},
				paint: {
					'line-color': route.color,
					'line-width': 4,
					'line-opacity': 0.75
				}
			});
		});
	}

	function fitMapToStops() {
		const bounds = new mapboxgl.LngLatBounds();

		stops.forEach((item) => {
			// Skip if coordinates are null
			if (!item.location.lat || !item.location.lon) {
				return;
			}

			const lat = parseFloat(item.location.lat);
			const lon = parseFloat(item.location.lon);

			if (!isNaN(lat) && !isNaN(lon)) {
				bounds.extend([lon, lat]);
			}
		});

		map.fitBounds(bounds, {
			padding: 80,
			maxZoom: 15,
			animate: false
		});
	}
</script>

<div bind:this={mapContainer} class="map-container"></div>

<style>
	.map-container {
		width: 100%;
		height: 600px;
		border-radius: 8px;
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
		width: 36px;
		height: 36px;
		background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%);
		border: 3px solid white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.3),
			0 0 0 2px hsl(var(--primary) / 0.2);
		transition: all 0.2s ease;
	}

	:global(.custom-marker:hover .marker-content) {
		transform: scale(1.15);
		box-shadow:
			0 4px 12px rgba(0, 0, 0, 0.4),
			0 0 0 4px hsl(var(--primary) / 0.3);
	}

	:global(.marker-number) {
		color: white;
		font-weight: 700;
		font-size: 13px;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}

	:global(.map-popup) {
		padding: 8px;
		min-width: 180px;
		max-width: 280px;
	}

	:global(.mapboxgl-popup-content) {
		border-radius: 12px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
		padding: 12px;
	}

	:global(.mapboxgl-popup-close-button) {
		font-size: 20px;
		padding: 4px 8px;
		color: hsl(var(--muted-foreground));
	}

	:global(.mapboxgl-popup-close-button:hover) {
		background-color: hsl(var(--muted));
		color: hsl(var(--foreground));
	}
</style>
