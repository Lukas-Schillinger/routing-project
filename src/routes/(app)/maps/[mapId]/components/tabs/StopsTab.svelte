<script lang="ts">
	import type { StopWithLocation } from '$lib/schemas/stop';
	import EditStopsDataTable from '../../tables/EditStopsDataTable';

	let {
		stops,
		mapId,
		readonly = false,
		onUpdate,
		onCreate,
		onDelete,
		onZoomToStop
	}: {
		stops: StopWithLocation[];
		mapId: string;
		readonly?: boolean;
		onUpdate?: () => void;
		onCreate?: () => void;
		onDelete?: () => void;
		onZoomToStop: (stopId: string) => void;
	} = $props();
</script>

<div class="h-full">
	{#if readonly}
		<!-- Read-only view for viewing mode -->
		<div class="space-y-2">
			{#each stops as stop (stop.stop.id)}
				<button
					type="button"
					class="flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-accent/50"
					onclick={() => onZoomToStop(stop.stop.id)}
				>
					<div
						class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
					>
						{#if stop.stop.delivery_index !== null}
							{stop.stop.delivery_index + 1}
						{:else}
							-
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">
							{stop.stop.contact_name || 'Unnamed Stop'}
						</p>
						<p class="truncate text-xs text-muted-foreground">
							{stop.location.address_line_1}
							{#if stop.location.city}, {stop.location.city}{/if}
						</p>
					</div>
				</button>
			{/each}
		</div>
	{:else}
		<!-- Editable data table -->
		<EditStopsDataTable {stops} {mapId} {onUpdate} {onCreate} {onDelete} {onZoomToStop} />
	{/if}
</div>
