<script lang="ts">
	import { ConfirmDeleteDialog } from '$lib/components/ConfirmDeleteDialog';
	import EditOrCreateStopPopover from '$lib/components/EditOrCreateStopPopover';
	import * as Actions from '$lib/components/TableActionsDropdown.Items';
	import TableActionsDropdown from '$lib/components/TableActionsDropdown.svelte';
	import DropdownMenuItem from '$lib/components/ui/dropdown-menu/dropdown-menu-item.svelte';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { stopApi } from '$lib/services/api';
	import { Pencil, Trash2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	interface Props {
		stop: StopWithLocation;
		onDelete?: (id: string) => Promise<void>;
		onUpdate?: (stop: StopWithLocation) => void;
		onZoomToStop?: (stopId: string) => void;
	}

	let { stop, onDelete, onUpdate, onZoomToStop }: Props = $props();

	const handleCopyId = () => {
		navigator.clipboard.writeText(stop.stop.id);
	};

	const handleDelete = async () => {
		await stopApi.delete(stop.stop.id);
		await onDelete?.(stop.stop.id);
		toast.success(`Stop Deleted`);
	};

	const handleStopUpdate = (updatedStop: StopWithLocation) => {
		onUpdate?.(updatedStop);
	};
</script>

<TableActionsDropdown>
	<EditOrCreateStopPopover
		mode="edit"
		triggerClass="w-full"
		{stop}
		onSuccess={handleStopUpdate}
	>
		<DropdownMenuItem onSelect={(e) => e.preventDefault()} class="w-full">
			<Pencil />
			Edit
		</DropdownMenuItem>
	</EditOrCreateStopPopover>
	<Actions.Copy onclick={handleCopyId} label="Copy ID" />
	<Actions.Zoom
		onclick={() => (onZoomToStop ? onZoomToStop(stop.stop.id) : '')}
		label="Zoom to"
	/>
	<ConfirmDeleteDialog
		description="Are you sure you want to delete the stop for {stop.stop
			.contact_name || 'this address'}?"
		onConfirm={handleDelete}
	>
		{#snippet trigger({ props })}
			<button
				{...props}
				class="relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none select-none hover:bg-accent hover:text-destructive"
			>
				<Trash2 class="h-4 w-4" />
				Delete
			</button>
		{/snippet}
	</ConfirmDeleteDialog>
	<Actions.MetadataLabel item={stop.stop} />
</TableActionsDropdown>
