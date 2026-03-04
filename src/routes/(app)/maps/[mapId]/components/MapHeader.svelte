<script lang="ts">
	import { ConfirmDeleteDialog } from '$lib/components/ConfirmDeleteDialog';
	import DropdownMetadataLabel from '$lib/components/DropdownMetadataLabel.svelte';
	import EditOrCreateMapPopover from '$lib/components/EditOrCreateMapPopover';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import type { Map } from '$lib/schemas/map';
	import Copy from '@lucide/svelte/icons/copy';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { toast } from 'svelte-sonner';

	type PageState = 'normal' | 'optimizing';

	let {
		map,
		pageState,
		onDelete,
		onUpdate
	}: {
		map: Map;
		pageState: PageState;
		onDelete?: () => void | Promise<void>;
		onUpdate?: (map: Map) => void;
	} = $props();

	const statusConfig = {
		normal: {
			label: 'Ready',
			class: 'bg-primary/10 text-primary'
		},
		optimizing: {
			label: 'Optimizing...',
			class: 'bg-warning/10 text-warning-foreground'
		}
	};

	const status = $derived(statusConfig[pageState]);

	function handleCopyId() {
		navigator.clipboard.writeText(map.id);
		toast.success('Map ID copied');
	}
</script>

<div class="flex items-center justify-between pb-3">
	<div class="flex items-center gap-3">
		<h1 class="text-xl font-semibold tracking-tight">{map.title}</h1>
		<Badge variant="secondary" class={status.class}>
			{status.label}
		</Badge>
	</div>

	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			<Button variant="ghost" size="icon-sm" aria-label="Map options">
				<Ellipsis class="h-4 w-4" />
			</Button>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<EditOrCreateMapPopover
				mode="edit"
				{map}
				onSuccess={(updatedMap) => onUpdate?.(updatedMap)}
				triggerClass="w-full"
			>
				{#snippet children({ props })}
					<DropdownMenu.ActionButton {...props}>
						<Pencil />
						Edit
					</DropdownMenu.ActionButton>
				{/snippet}
			</EditOrCreateMapPopover>
			<DropdownMenu.Item onclick={handleCopyId}>
				<Copy class="h-4 w-4" />
				<span class="text-muted-foreground">Copy Map ID</span>
			</DropdownMenu.Item>
			{#if onDelete}
				<DropdownMenu.Separator />
				<ConfirmDeleteDialog
					description="Are you sure you want to delete this map? This action cannot be undone."
					onConfirm={onDelete}
				>
					{#snippet trigger({ props })}
						<DropdownMenu.ActionButton {...props} variant="destructive">
							<Trash2 />
							Delete
						</DropdownMenu.ActionButton>
					{/snippet}
				</ConfirmDeleteDialog>
			{/if}
			<DropdownMetadataLabel item={map} />
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
