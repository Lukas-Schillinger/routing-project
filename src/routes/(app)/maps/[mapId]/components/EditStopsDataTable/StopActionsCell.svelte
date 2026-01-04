<script lang="ts">
	import EditOrCreateStopPopover from '$lib/components/EditOrCreateStopPopover';
	import * as Actions from '$lib/components/TableActionsDropdown.Items';
	import TableActionsDropdown from '$lib/components/TableActionsDropdown.svelte';
	import DropdownMenuItem from '$lib/components/ui/dropdown-menu/dropdown-menu-item.svelte';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { ServiceError } from '$lib/errors';
	import { stopApi } from '$lib/services/api';
	import { Pencil } from 'lucide-svelte';
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
		if (
			!confirm(
				`Are you sure you want to delete the stop for ${stop.stop.contact_name || 'this address'}?`
			)
		) {
			return;
		}

		try {
			await stopApi.delete(stop.stop.id);
			await onDelete?.(stop.stop.id);
			toast.success(`Stop Deleted`);
		} catch (err) {
			if (err instanceof ServiceError) {
				toast.error(err.message);
			} else {
				toast.error('An unknown error occurred');
			}
		}
	};

	const handleStopUpdate = (updatedStop: StopWithLocation) => {
		onUpdate?.(updatedStop);
	};
</script>

<TableActionsDropdown>
	<EditOrCreateStopPopover mode="edit" triggerClass="w-full" {stop} onSuccess={handleStopUpdate}>
		<DropdownMenuItem onSelect={(e) => e.preventDefault()} class="w-full">
			<Pencil />
			Edit
		</DropdownMenuItem>
	</EditOrCreateStopPopover>
	<Actions.Copy onclick={handleCopyId} label="Copy ID" />
	<Actions.Zoom onclick={() => (onZoomToStop ? onZoomToStop(stop.stop.id) : '')} label="Zoom to" />
	<Actions.Delete onclick={handleDelete} />
	<Actions.MetadataLabel item={stop.stop} />
</TableActionsDropdown>
