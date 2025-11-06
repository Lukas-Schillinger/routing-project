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

<div class="min-w-48 space-y-3 p-1">
	<h3 class=" text-sm font-semibold">{stop.contact_name || 'Unknown'}</h3>
	<div>
		<p class=" text-xs text-muted-foreground">{location.address_line1}</p>

		{#if location.city}
			<p class="mb-1 text-xs text-muted-foreground">
				{location.city}, {location.region || ''}
				{location.postal_code || ''}
			</p>
		{/if}
	</div>

	{#if stop.notes}
		<p class="text-xs text-muted-foreground italic">{stop.notes}</p>
	{/if}

	<div class="">
		<Button class="h-6 w-full" size="sm" onclick={() => onGoToStop(stop.id)}>Go to Stop</Button>
	</div>
</div>
