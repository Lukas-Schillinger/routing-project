<script lang="ts">
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { addressDisplay } from '$lib/utils';
	import { createSortable } from '@dnd-kit/svelte/sortable';

	let {
		stop,
		index,
		driverId
	}: {
		stop: StopWithLocation;
		index: number;
		driverId: string;
	} = $props();

	const sortable = createSortable({
		id: stop.stop.id,
		index,
		group: driverId
	});

	const addr = $derived(addressDisplay(stop.location));
</script>

<div
	{@attach sortable.attach}
	class="flex items-start gap-3 rounded-md bg-card text-card-foreground py-2 px-3 outline-none cursor-grab shadow-sm"
>
	<div
		class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
	>
		{index + 1}
	</div>
	<div class="min-w-0 flex-1">
		<p class="truncate text-sm">
			{stop.stop.contact_name || addr.topLine}
		</p>
		<p class="truncate text-xs text-muted-foreground">
			{#if stop.stop.contact_name}
				{addr.topLine}
			{:else}
				{addr.bottomLine}
			{/if}
		</p>
	</div>
</div>
