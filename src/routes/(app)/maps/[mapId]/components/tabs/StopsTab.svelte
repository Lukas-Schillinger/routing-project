<script lang="ts">
	import type { Driver } from '$lib/schemas/driver';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import EditStopsDataTable from '../EditStopsDataTable';

	let {
		stops,
		drivers,
		mapId,
		sortColumn = $bindable('updated_at'),
		sortDirection = $bindable('desc'),
		onUpdate,
		onCreate,
		onDelete,
		onZoomToStop
	}: {
		stops: StopWithLocation[];
		drivers: Driver[];
		mapId: string;
		sortColumn?: string;
		sortDirection?: 'asc' | 'desc';
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
		bind:sortColumn
		bind:sortDirection
		{onUpdate}
		{onCreate}
		{onDelete}
		{onZoomToStop}
	/>
</div>
