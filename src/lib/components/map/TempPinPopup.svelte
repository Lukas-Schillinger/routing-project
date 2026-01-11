<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import EditOrCreateStopPopover from '$lib/components/EditOrCreateStopPopover';
	import type { LocationCreate } from '$lib/schemas';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { addressDisplay } from '$lib/utils';
	import { LoaderCircle, Plus, Trash2 } from 'lucide-svelte';

	let {
		mapId,
		location,
		isLoading = false,
		onCreateSuccess,
		onDelete
	}: {
		mapId: string;
		location: LocationCreate | null;
		isLoading?: boolean;
		onCreateSuccess: (stop: StopWithLocation) => void;
		onDelete: () => void;
	} = $props();

	const addr = $derived(location ? addressDisplay(location) : null);
</script>

<div class="min-w-52 space-y-3 p-1">
	<div class="space-y-1">
		{#if isLoading}
			<div class="flex items-center gap-2">
				<LoaderCircle class="h-4 w-4 animate-spin text-muted-foreground" />
				<p class="text-sm text-muted-foreground">Finding address...</p>
			</div>
		{:else if location === null}
			<p class="text-sm text-muted-foreground">Address not found</p>
		{:else if addr}
			<p class="text-sm font-medium">{addr.topLine}</p>
			{#if addr.bottomLine}
				<p class="text-xs text-muted-foreground">{addr.bottomLine}</p>
			{/if}
		{/if}
	</div>

	<div class="flex gap-2">
		{#if location}
			<EditOrCreateStopPopover
				mode="create"
				{mapId}
				initialData={{ location }}
				onSuccess={onCreateSuccess}
			>
				<Button size="sm" class="flex-1">
					<Plus class="mr-1 h-3.5 w-3.5" />
					Create Stop
				</Button>
			</EditOrCreateStopPopover>
		{/if}
		<Button
			size="sm"
			variant="ghost"
			disabled={isLoading || location === null}
			onclick={onDelete}
		>
			<Trash2 class="h-3.5 w-3.5" />
		</Button>
	</div>
</div>
