<!-- src/lib/components/StopMapPopup.svelte -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { StopWithLocation } from '$lib/schemas';

	let {
		stop,
		location,
		index,
		onGoToStop = () => {}
	}: {
		stop: StopWithLocation['stop'];
		location: StopWithLocation['location'];
		index: number;
		onGoToStop?: (stopId: string) => void;
	} = $props();
</script>

<div class="map-popup">
	<h3 class="mb-1 text-sm font-semibold">{stop.contact_name || 'Unknown'}</h3>
	<p class="mb-1 text-xs text-muted-foreground">{location.address_line1}</p>

	{#if location.city}
		<p class="mb-1 text-xs text-muted-foreground">
			{location.city}, {location.region || ''}
			{location.postal_code || ''}
		</p>
	{/if}

	{#if stop.contact_phone}
		<p class="mt-2 text-xs">📞 {stop.contact_phone}</p>
	{/if}

	{#if stop.notes}
		<p class="mt-2 text-xs text-muted-foreground italic">{stop.notes}</p>
	{/if}

	<div class="mt-3">
		<Button size="sm" class="w-full" onclick={() => onGoToStop(stop.id)}>Go to Stop</Button>
	</div>
</div>

<style>
	.map-popup {
		padding: 4px;
		min-width: 180px;
		max-width: 280px;
	}
</style>
