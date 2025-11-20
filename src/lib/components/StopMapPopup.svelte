<!-- src/lib/components/StopMapPopup.svelte -->
<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import type { Driver, StopWithLocation } from '$lib/schemas';
	import { getIdenticon } from '$lib/utils';

	let {
		stop,
		location,
		driver,
		onGoToStop = () => {}
	}: {
		stop: StopWithLocation['stop'];
		location: StopWithLocation['location'];
		driver?: Driver;
		onGoToStop?: (stopId: string) => void;
	} = $props();
</script>

<div class="min-w-48 p-1">
	{#if driver && stop.delivery_index}
		<div class="flex place-items-center gap-2 pb-4">
			<Avatar.Root>
				<Avatar.Image src={getIdenticon(driver)} alt="@shadcn" />
				<Avatar.Fallback>CN</Avatar.Fallback>
			</Avatar.Root>
			<div class="">
				<div class="text-lg font-semibold">{driver.name}</div>
				<div class="text-sm">stop #{stop.delivery_index}</div>
			</div>
		</div>
	{/if}
	<div class="">
		<h3 class="pb-1 text-base font-medium">{stop.contact_name || 'Unknown'}</h3>
		<div>
			<p class=" text-sm text-muted-foreground">{location.address_line_1}</p>

			{#if location.city}
				<p class="mb-1 text-sm text-muted-foreground">
					{location.city}, {location.region || ''}
					{location.postal_code || ''}
				</p>
			{/if}
		</div>

		{#if stop.notes}
			<p class="text-xs text-muted-foreground italic">{stop.notes}</p>
		{/if}
	</div>

	<!-- 	<div class="">
		<Button class="h-6 w-full" size="sm" onclick={() => onGoToStop(stop.id)}>Go to Stop</Button>
	</div> -->
</div>
