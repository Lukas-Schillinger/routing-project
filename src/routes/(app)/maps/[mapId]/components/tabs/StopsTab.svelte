<script lang="ts">
	import type { Driver } from '$lib/schemas/driver';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import EditStopsDataTable from '../EditStopsDataTable';

	let {
		stops,
		drivers,
		mapId,
		onUpdate,
		onCreate,
		onDelete,
		onZoomToStop
	}: {
		stops: StopWithLocation[];
		drivers: Driver[];
		mapId: string;
		onUpdate?: () => void;
		onCreate?: () => void;
		onDelete?: () => Promise<void>;
		onZoomToStop: (stopId: string) => void;
	} = $props();
</script>

<div class="h-full">
	<EditStopsDataTable
		{stops}
		{drivers}
		{mapId}
		{onUpdate}
		{onCreate}
		{onDelete}
		{onZoomToStop}
	/>
</div>
