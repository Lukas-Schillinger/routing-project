<script lang="ts">
	import type { LocationCreate } from '$lib/schemas';
	import { MapPinPlus } from 'phosphor-svelte';
	import { Marker, Popup } from 'svelte-maplibre';
	import TempPinPopup from './TempPinPopup.svelte';

	let {
		lngLat,
		location,
		isLoading = false,
		onCreateStop,
		onDelete
	}: {
		lngLat: [number, number];
		location: LocationCreate;
		isLoading?: boolean;
		onCreateStop: () => void;
		onDelete: () => void;
	} = $props();

	// Track popup open state for auto-open on mount
	let popupOpen = $state(true);
</script>

<Marker {lngLat} class="cursor-pointer">
	<div class="animate-pulse transition-transform duration-100 hover:scale-110">
		<MapPinPlus weight="fill" class="size-8 text-primary drop-shadow-md" />
	</div>

	<Popup
		openOn="click"
		offset={[0, -15]}
		closeOnClickOutside
		closeButton
		bind:open={popupOpen}
	>
		<TempPinPopup {location} {isLoading} {onCreateStop} {onDelete} />
	</Popup>
</Marker>
