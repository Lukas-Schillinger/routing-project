<script lang="ts">
	import { PUBLIC_MAPBOX_ACCESS_TOKEN } from '$env/static/public';
	import type { StopWithLocation } from '$lib/schemas';
	import mapboxgl from 'mapbox-gl';
	import 'mapbox-gl/dist/mapbox-gl.css';
	import { mount, onMount, unmount } from 'svelte';
	import StopMapPopup from './StopMapPopup.svelte';

	interface Route {
		id: string;
		coordinates: [number, number][];
		color: string;
	}

	let {
		stops = [],
		routes = [],
		center = [-98.5795, 39.8283],
		zoom = 4,
		onGoToStop = (stopId: string) => {}
	}: {
		stops?: StopWithLocation[];
		routes?: Route[];
		center?: [number, number];
		zoom?: number;
		onGoToStop?: (stopId: string) => void;
	} = $props();

	let mapContainer: HTMLDivElement;
	let map: mapboxgl.Map;

	// Track mounted popup components for cleanup
	let mountedPopups = new Map<string, { component: any; container: HTMLElement }>();

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
		// map.addControl(new mapboxgl.NavigationControl(), 'top-right');
		// map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

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
			// Clean up all mounted popups
			mountedPopups.forEach(({ component, container }) => {
				unmount(component);
			});
			mountedPopups.clear();

			map.remove();
		};
	});

	/** I don't like that I can't understand this! I tried to use https://github.com/beyonk-group/svelte-mapbox to implement */
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

			const popupId = `popup-${stop.id}`;

			// Create popup (will mount component on open)
			const popup = new mapboxgl.Popup({
				offset: 25,
				maxWidth: '300px'
			});

			// Mount component when popup opens
			popup.on('open', () => {
				// Create new container each time
				const popupContainer = document.createElement('div');

				// Mount Svelte component
				const component = mount(StopMapPopup, {
					target: popupContainer,
					props: {
						stop,
						location,
						index,
						onGoToStop: (stopId: string) => {
							// Close the popup
							popup.remove();
							// Call parent handler
							onGoToStop(stopId);
						}
					}
				});

				// Set the content
				popup.setDOMContent(popupContainer);

				// Store reference for cleanup
				mountedPopups.set(popupId, { component, container: popupContainer });
			});

			// Clean up on popup close
			popup.on('close', () => {
				const mounted = mountedPopups.get(popupId);
				if (mounted) {
					unmount(mounted.component);
					mountedPopups.delete(popupId);
				}
			});

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
		height: 100%;
		border-radius: 0;
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
		background: #0f4f44; /* forest-600 */
		border: 3px solid white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.3),
			0 0 0 2px rgba(15, 79, 68, 0.3); /* forest-600 with opacity */
		transition: all 0.2s ease;
		position: relative;
	}

	/* Outer ring effect similar to Google Maps */
	:global(.marker-content::before) {
		content: '';
		position: absolute;
		inset: -6px;
		border-radius: 50%;
		border: 2px solid rgba(15, 79, 68, 0.4); /* forest-600 with opacity */
		pointer-events: none;
	}

	:global(.custom-marker:hover .marker-content) {
		transform: scale(1.15);
		box-shadow:
			0 4px 12px rgba(0, 0, 0, 0.4),
			0 0 0 3px rgba(15, 79, 68, 0.4); /* forest-600 with opacity */
	}

	:global(.custom-marker:hover .marker-content::before) {
		border-color: rgba(15, 79, 68, 0.6); /* forest-600 with opacity */
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
