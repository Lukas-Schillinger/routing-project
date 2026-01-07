<script lang="ts">
	import EditOrCreateMapPopover from '$lib/components/EditOrCreateMapPopover';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import type { Map } from '$lib/schemas/map';
	import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	type PageState = 'viewing' | 'optimizing' | 'editing';

	let {
		title,
		mapId,
		pageState,
		onDelete,
		onUpdate
	}: {
		title: string;
		mapId: string;
		pageState: PageState;
		onDelete?: () => void;
		onUpdate?: (map: Map) => void;
	} = $props();

	const statusConfig = {
		editing: {
			label: 'Editing',
			class: 'bg-muted text-muted-foreground'
		},
		optimizing: {
			label: 'Optimizing...',
			class: 'bg-warning/10 text-warning-foreground'
		},
		viewing: {
			label: 'Ready',
			class: 'bg-primary/10 text-primary'
		}
	};

	const status = $derived(statusConfig[pageState]);

	function handleCopyId() {
		navigator.clipboard.writeText(mapId);
		toast.success('Map ID copied');
	}
</script>

<div class="flex items-center justify-between pb-3">
	<div class="flex items-center gap-3">
		<h1 class="text-xl font-semibold tracking-tight">{title}</h1>
		<Badge variant="secondary" class={status.class}>
			{status.label}
		</Badge>
	</div>

	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			<Button variant="ghost" size="icon" class="h-8 w-8">
				<MoreHorizontal class="h-4 w-4" />
			</Button>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<EditOrCreateMapPopover
				mode="edit"
				map={{
					id: mapId,
					title,
					organization_id: '',
					created_at: new Date(),
					updated_at: new Date()
				}}
				onSuccess={(map) => onUpdate?.(map)}
				triggerClass="w-full"
			>
				{#snippet children({ props })}
					<button
						{...props}
						class="relative flex w-full cursor-default items-center rounded-sm px-2 py-1.5 text-sm text-muted-foreground outline-none select-none hover:bg-accent hover:text-accent-foreground"
					>
						<Pencil class="mr-4 h-4 w-4" />
						Edit
					</button>
				{/snippet}
			</EditOrCreateMapPopover>
			<DropdownMenu.Item onclick={handleCopyId}>
				<Copy class="mr-2 h-4 w-4" />
				<span class="text-muted-foreground">Copy Map ID</span>
			</DropdownMenu.Item>
			{#if onDelete}
				<DropdownMenu.Separator />
				<DropdownMenu.Item class="text-destructive" onclick={onDelete}>
					<Trash2 class="mr-2 h-4 w-4" />
					Delete Map
				</DropdownMenu.Item>
			{/if}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
