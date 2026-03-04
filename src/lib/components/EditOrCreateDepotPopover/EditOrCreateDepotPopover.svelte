<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Popover from '$lib/components/ui/popover';
	import type { DepotWithLocationJoin } from '$lib/schemas/depot';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Warehouse from '@lucide/svelte/icons/warehouse';
	import type { Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import Form from './Form.svelte';

	// Props
	let {
		mode = 'create',
		depot = undefined,
		triggerClass = '',
		children,
		onSuccess = () => {},
		onDelete
	}: {
		mode?: 'create' | 'edit';
		depot?: DepotWithLocationJoin;
		triggerClass?: string;
		children?: Snippet;
		onSuccess?: (depot: DepotWithLocationJoin) => void;
		onDelete?: () => Promise<void>;
	} = $props();

	// Validation
	$effect(() => {
		if (mode === 'edit' && !depot) {
			throw new Error('depot prop is required when mode is "edit"');
		}
	});

	// State
	const isDesktop = new MediaQuery('(min-width: 768px)');
	let open = $state(false);

	// Handle open change
	function handleOpenChange(isOpen: boolean) {
		open = isOpen;
	}
</script>

{#if isDesktop.current}
	<Popover.Root bind:open onOpenChange={handleOpenChange}>
		<Popover.Trigger class={triggerClass}>
			{#if children}
				{@render children()}
			{:else if mode === 'create'}
				<Button size="sm" variant="secondary">
					<Warehouse class="h-4 w-4" />
					Create Depot
				</Button>
			{:else}
				<Button variant="ghost" size="icon" aria-label="Edit depot">
					<Pencil class="h-4 w-4" />
				</Button>
			{/if}
		</Popover.Trigger>
		<Popover.Content class="w-96">
			<Form
				bind:open
				{depot}
				{mode}
				{onDelete}
				onSuccess={(depot) => {
					open = false;
					onSuccess(depot);
				}}
			/>
		</Popover.Content>
	</Popover.Root>
{:else}
	<Drawer.Root bind:open onOpenChange={handleOpenChange}>
		<Drawer.Trigger class={triggerClass}>
			{#if children}
				{@render children()}
			{:else if mode === 'create'}
				<Button size="sm" variant="secondary">
					<Warehouse class="h-4 w-4" />
					Create Depot
				</Button>
			{:else}
				<Button variant="ghost" size="icon" aria-label="Edit depot">
					<Pencil class="h-4 w-4" />
				</Button>
			{/if}
		</Drawer.Trigger>
		<Drawer.Content>
			<div class="p-4">
				<Form
					bind:open
					{depot}
					{mode}
					{onDelete}
					onSuccess={(depot) => {
						open = false;
						onSuccess(depot);
					}}
				/>
			</div>
		</Drawer.Content>
	</Drawer.Root>
{/if}
