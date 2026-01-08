<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Popover from '$lib/components/ui/popover';
	import type { DepotWithLocationJoin } from '$lib/schemas/depot';
	import type { LocationCreate } from '$lib/schemas/location';
	import { Pencil } from 'lucide-svelte';
	import { Garage } from 'phosphor-svelte';
	import type { Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import Form from './Form.svelte';

	// Props
	let {
		mode = 'create',
		depot = undefined,
		triggerClass = '',
		children,
		onSuccess = () => {}
	}: {
		mode?: 'create' | 'edit';
		depot?: DepotWithLocationJoin;
		triggerClass?: string; // annoying hack for making the slotted component able to fill the full length of a dropdown
		children?: Snippet;
		onSuccess?: (depot: DepotWithLocationJoin) => void;
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
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	// Form fields
	let depotName = $state('');
	let address = $state('');
	let isDefault = $state(false);
	let selectedLocation = $state<LocationCreate | null>(null);

	// Initialize form with existing data in edit mode
	$effect(() => {
		if (mode === 'edit' && depot && open) {
			depotName = depot.depot.name;
			isDefault = depot.depot.default_depot;
			const loc = depot.location;
			address = loc.address_line_1;
		}
	});

	// Reset form
	function resetForm() {
		if (mode === 'create') {
			depotName = '';
			address = '';
			isDefault = false;
			selectedLocation = null;
		} else if (depot) {
			depotName = depot.depot.name;
			address = depot.location.address_line_1;
			isDefault = depot.depot.default_depot;
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
				<Button size="sm" variant="secondary">
					<Garage class="mr-2 h-4 w-4" />
					Create Depot
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
				{depot}
				{mode}
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
					<Garage class="mr-2 h-4 w-4" />
					Create Depot
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
					{depot}
					{mode}
					onSuccess={(depot) => {
						open = false;
						onSuccess(depot);
					}}
				/>
			</div>
		</Drawer.Content>
	</Drawer.Root>
{/if}
