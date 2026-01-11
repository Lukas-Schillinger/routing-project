<script lang="ts">
	import type { StopWithLocation } from '$lib/schemas/stop';
	import EditStopsDataTable from '../EditStopsDataTable';

	let {
		stops,
		mapId,
		onUpdate,
		onCreate,
		onDelete,
		onZoomToStop
	}: {
		stops: StopWithLocation[];
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
		{mapId}
		{onUpdate}
		{onCreate}
		{onDelete}
		{onZoomToStop}
	/>
</div>
