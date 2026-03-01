<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Popover from '$lib/components/ui/popover';
	import type { LocationCreate } from '$lib/schemas/location';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { Pencil, Plus } from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import Form from './Form.svelte';

	type InitialData = {
		location?: LocationCreate;
		contactName?: string;
		contactPhone?: string;
		notes?: string;
	};

	// Props
	let {
		mode = 'create',
		stop = undefined,
		mapId = undefined,
		initialData = undefined,
		triggerClass = '',
		children,
		onSuccess = () => {}
	}: {
		mode?: 'create' | 'edit';
		stop?: StopWithLocation;
		mapId?: string;
		initialData?: InitialData;
		triggerClass?: string;
		children?: Snippet;
		onSuccess?: (stop: StopWithLocation) => void;
	} = $props();

	// Validation
	$effect(() => {
		if (mode === 'edit' && !stop) {
			throw new Error('stop prop is required when mode is "edit"');
		}
		if (mode === 'create' && !mapId) {
			throw new Error('mapId prop is required when mode is "create"');
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
				<Button variant="default">
					<Plus class="h-4 w-4" />
					Add Stop
				</Button>
			{:else}
				<Button variant="ghost" size="icon" aria-label="Edit stop">
					<Pencil class="h-4 w-4" />
				</Button>
			{/if}
		</Popover.Trigger>
		<Popover.Content class="w-96">
			<Form
				bind:open
				{stop}
				{mapId}
				{initialData}
				{mode}
				onSuccess={(stop) => {
					open = false;
					onSuccess(stop);
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
				<Button variant="default">
					<Plus class="h-4 w-4" />
					Add Stop
				</Button>
			{:else}
				<Button variant="ghost" size="icon" aria-label="Edit stop">
					<Pencil class="h-4 w-4" />
				</Button>
			{/if}
		</Drawer.Trigger>
		<Drawer.Content>
			<div class="p-4">
				<Form
					bind:open
					{stop}
					{mapId}
					{initialData}
					{mode}
					onSuccess={(stop) => {
						open = false;
						onSuccess(stop);
					}}
				/>
			</div>
		</Drawer.Content>
	</Drawer.Root>
{/if}
