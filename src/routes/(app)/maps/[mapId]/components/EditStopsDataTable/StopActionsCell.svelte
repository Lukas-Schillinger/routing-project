<script lang="ts">
	import { ConfirmDeleteDialog } from '$lib/components/ConfirmDeleteDialog';
	import EditOrCreateStopPopover from '$lib/components/EditOrCreateStopPopover';
	import DropdownMetadataLabel from '$lib/components/DropdownMetadataLabel.svelte';
	import TableActionsDropdown from '$lib/components/TableActionsDropdown.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { stopApi } from '$lib/services/api';
	import { Copy, Eye, Pencil, Trash2 } from 'lucide-svelte';
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
		toast.success('Copied to clipboard');
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

<TableActionsDropdown label="Stop options">
	<EditOrCreateStopPopover
		mode="edit"
		triggerClass="w-full"
		{stop}
		onSuccess={handleStopUpdate}
	>
		<DropdownMenu.Item onSelect={(e) => e.preventDefault()} class="w-full">
			<Pencil />
			Edit
		</DropdownMenu.Item>
	</EditOrCreateStopPopover>
	<DropdownMenu.Item onclick={handleCopyId}>
		<Copy />
		Copy ID
	</DropdownMenu.Item>
	<DropdownMenu.Item
		onclick={() => (onZoomToStop ? onZoomToStop(stop.stop.id) : '')}
	>
		<Eye />
		Zoom to
	</DropdownMenu.Item>
	<ConfirmDeleteDialog
		description="Are you sure you want to delete the stop for {stop.stop
			.contact_name || 'this address'}?"
		onConfirm={handleDelete}
	>
		{#snippet trigger({ props })}
			<DropdownMenu.ActionButton {...props} variant="destructive">
				<Trash2 />
				Delete
			</DropdownMenu.ActionButton>
		{/snippet}
	</ConfirmDeleteDialog>
	<DropdownMetadataLabel item={stop.stop} />
</TableActionsDropdown>
