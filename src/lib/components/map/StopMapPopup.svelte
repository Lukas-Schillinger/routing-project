<!-- src/lib/components/StopMapPopup.svelte -->
<script lang="ts">
	import { ConfirmDeleteDialog } from '$lib/components/ConfirmDeleteDialog';
	import DriverPicker from '$lib/components/map/DriverPicker.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ServiceError } from '$lib/errors';
	import type { Driver, StopWithLocation } from '$lib/schemas';
	import { stopApi } from '$lib/services/api/stops';
	import { addressDisplay } from '$lib/utils';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { toast } from 'svelte-sonner';

	let {
		stop,
		stops,
		drivers,
		onDelete,
		onUpdate
	}: {
		stop: StopWithLocation;
		stops: StopWithLocation[];
		drivers: Driver[];
		onDelete?: () => void;
		onUpdate?: (stop: StopWithLocation) => void;
	} = $props();

	const driver = $derived(
		stop.stop.driver_id
			? drivers.find((d) => d.id === stop.stop.driver_id)
			: null
	);

	const address = $derived(addressDisplay(stop.location));

	let isDeleting = $state(false);

	async function handleDelete() {
		isDeleting = true;
		try {
			await stopApi.delete(stop.stop.id);
			onDelete?.();
		} catch (error) {
			const message =
				error instanceof ServiceError ? error.message : 'Failed to delete stop';
			toast.error(message);
		} finally {
			isDeleting = false;
		}
	}
</script>

<div class="min-w-52 space-y-3 rounded-lg p-1">
	{#if drivers.length > 0}
		<div class="flex items-center gap-2.5">
			{#if stop.stop.delivery_index}
				<div
					class="flex h-8 items-center justify-center rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground"
				>
					#{stop.stop.delivery_index}
				</div>
			{/if}
			<DriverPicker {stop} {stops} {drivers} onDriverChange={onUpdate} />
			{#if driver}
				<div class="min-w-0 flex-1">
					<div class="truncate text-sm font-medium">{driver.name}</div>
				</div>
			{/if}
		</div>
		<div class="h-px bg-border"></div>
	{/if}

	<div class="space-y-2">
		{#if stop.stop.contact_name}
			<h3 class="text-sm leading-tight font-medium">
				{stop.stop.contact_name}
			</h3>
		{/if}
		<div class="space-y-0.5">
			<p class="text-xs leading-relaxed text-muted-foreground">
				{address.topLine}
			</p>
			{#if address.bottomLine}
				<p class="text-xs text-muted-foreground/70">
					{address.bottomLine}
				</p>
			{/if}
		</div>

		{#if stop.stop.notes}
			<div class="mt-2 rounded bg-muted px-2 py-1.5">
				<p class="text-xs leading-relaxed text-muted-foreground">
					{stop.stop.notes}
				</p>
			</div>
		{/if}
	</div>

	{#if onDelete}
		<div class="flex justify-end border-t pt-2">
			<ConfirmDeleteDialog
				title="Delete Stop"
				description="Are you sure you want to delete this stop? This action cannot be undone."
				onConfirm={handleDelete}
			>
				{#snippet trigger({ props })}
					<Button {...props} variant="ghost" size="sm" disabled={isDeleting}>
						{#if isDeleting}
							<LoaderCircle class="h-3.5 w-3.5 animate-spin" />
						{:else}
							<Trash2 class="h-3.5 w-3.5" />
						{/if}
					</Button>
				{/snippet}
			</ConfirmDeleteDialog>
		</div>
	{/if}
</div>
