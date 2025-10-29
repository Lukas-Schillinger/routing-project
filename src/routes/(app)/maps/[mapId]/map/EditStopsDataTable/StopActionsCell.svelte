<script lang="ts">
	import EditOrCreateStopPopover from '$lib/components/EditOrCreateStopPopover.svelte';
	import * as Actions from '$lib/components/TableActionsDropdown.Items';
	import TableActionsDropdown from '$lib/components/TableActionsDropdown.svelte';
	import DropdownMenuItem from '$lib/components/ui/dropdown-menu/dropdown-menu-item.svelte';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { Pencil } from 'lucide-svelte';

	interface Props {
		stop: StopWithLocation;
		onDelete?: (id: string) => Promise<void>;
		onUpdate?: (stop: StopWithLocation) => void;
	}

	let { stop, onDelete, onUpdate }: Props = $props();

	const handleCopyId = () => {
		navigator.clipboard.writeText(stop.stop.id);
	};

	const handleDelete = async () => {
		if (
			confirm(
				`Are you sure you want to delete the stop for ${stop.stop.contact_name || 'this address'}?`
			)
		) {
			await onDelete?.(stop.stop.id);
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
	<Actions.Delete onclick={handleDelete} />
	<Actions.MetadataLabel item={stop.stop} />
</TableActionsDropdown>
