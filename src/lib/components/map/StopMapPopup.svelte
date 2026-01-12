<!-- src/lib/components/StopMapPopup.svelte -->
<script lang="ts">
	import { ConfirmDeleteDialog } from '$lib/components/ConfirmDeleteDialog';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { ServiceError } from '$lib/errors';
	import type { Driver, StopWithLocation } from '$lib/schemas';
	import { stopApi } from '$lib/services/api/stops';
	import { getIdenticon } from '$lib/utils';
	import { LoaderCircle, Trash2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let {
		stop,
		location,
		driver,
		onDelete
	}: {
		stop: StopWithLocation['stop'];
		location: StopWithLocation['location'];
		driver?: Driver;
		onDelete?: () => void;
	} = $props();

	let isDeleting = $state(false);

	async function handleDelete() {
		isDeleting = true;
		try {
			await stopApi.delete(stop.id);
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
	{#if driver && stop.delivery_index}
		<div class="flex items-center gap-2.5">
			<div
				class="flex h-8 items-center justify-center rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground"
			>
				stop {stop.delivery_index}
			</div>
			<Avatar.Root class="h-8 w-8 ring-1 ring-border">
				<Avatar.Image src={getIdenticon(driver)} alt={driver.name} />
				<Avatar.Fallback class="bg-muted text-xs text-muted-foreground">
					{driver.name?.slice(0, 2).toUpperCase() || 'DR'}
				</Avatar.Fallback>
			</Avatar.Root>
			<div class="min-w-0 flex-1">
				<div class="truncate text-sm font-medium">{driver.name}</div>
			</div>
		</div>
		<div class="h-px bg-border"></div>
	{/if}

	<div class="space-y-2">
		{#if stop.contact_name}
			<h3 class="text-sm leading-tight font-medium">{stop.contact_name}</h3>
		{/if}
		<div class="space-y-0.5">
			<p class="text-xs leading-relaxed text-muted-foreground">
				{location.address_line_1}
			</p>
			{#if location.city}
				<p class="text-xs text-muted-foreground/70">
					{location.city}{location.region
						? `, ${location.region}`
						: ''}{location.postal_code ? ` ${location.postal_code}` : ''}
				</p>
			{/if}
		</div>

		{#if stop.notes}
			<div class="mt-2 rounded bg-muted px-2 py-1.5">
				<p class="text-xs leading-relaxed text-muted-foreground">
					{stop.notes}
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
