<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Popover from '$lib/components/ui/popover';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { Pencil, Plus } from 'lucide-svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import Form from './Form.svelte';

	// Props
	let {
		mode = 'create',
		stop = undefined,
		mapId = undefined,
		triggerClass = '',
		children,
		onSuccess = () => {}
	}: {
		mode?: 'create' | 'edit';
		stop?: StopWithLocation;
		mapId?: string;
		triggerClass?: string;
		children?: any;
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
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	// Form fields
	let contactName = $state('');
	let contactPhone = $state('');
	let address = $state('');
	let notes = $state('');
	let selectedLocation = $state(null);

	// Initialize form with existing data in edit mode
	$effect(() => {
		if (mode === 'edit' && stop && open) {
			contactName = stop.stop.contact_name || '';
			contactPhone = stop.stop.contact_phone || '';
			notes = stop.stop.notes || '';
			const loc = stop.location;
			address = loc.address_line_1;
		}
	});

	// Reset form
	function resetForm() {
		if (mode === 'create') {
			contactName = '';
			contactPhone = '';
			notes = '';
			address = '';
			selectedLocation = null;
		} else if (stop) {
			contactName = stop.stop.contact_name || '';
			contactPhone = stop.stop.contact_phone || '';
			notes = stop.stop.notes || '';
			address = stop.location.address_line_1;
			selectedLocation = null;
		}
		error = null;
	}

	// Handle open change
	function handleOpenChange(isOpen: boolean) {
		open = isOpen;
		if (!isOpen && !isSubmitting) {
			resetForm();
		}
	}
</script>

{#if isDesktop.current}
	<Popover.Root bind:open onOpenChange={handleOpenChange}>
		<Popover.Trigger class={triggerClass}>
			{#if children}
				{@render children()}
			{:else if mode === 'create'}
				<Button variant="default">
					<Plus class="mr-2 h-4 w-4" />
					Add Stop
				</Button>
			{:else}
				<Button variant="ghost" size="icon">
					<Pencil class="h-4 w-4" />
				</Button>
			{/if}
		</Popover.Trigger>
		<Popover.Content class="w-96">
			<Form
				bind:open
				{stop}
				{mapId}
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
					<Plus class="mr-2 h-4 w-4" />
					Add Stop
				</Button>
			{:else}
				<Button variant="ghost" size="icon">
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
