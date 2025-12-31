<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Copy, MoreHorizontal, Trash2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	type PageState = 'viewing' | 'optimizing' | 'editing';

	let {
		title,
		mapId,
		pageState,
		onDelete
	}: {
		title: string;
		mapId: string;
		pageState: PageState;
		onDelete?: () => void;
	} = $props();

	const statusConfig = {
		editing: {
			label: 'Editing',
			class: 'bg-muted text-muted-foreground'
		},
		optimizing: {
			label: 'Optimizing...',
			class: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
		},
		viewing: {
			label: 'Ready',
			class: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
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
			<DropdownMenu.Item onclick={handleCopyId}>
				<Copy class="mr-2 h-4 w-4" />
				Copy Map ID
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
