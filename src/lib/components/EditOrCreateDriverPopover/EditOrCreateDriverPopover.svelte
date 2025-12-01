<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Popover from '$lib/components/ui/popover';
	import type { Driver } from '$lib/schemas/driver';
	import { Pencil, Truck } from 'lucide-svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import Form from './Form.svelte';

	// Props
	let {
		mode = 'create',
		driver = undefined,
		mapId = undefined,
		triggerClass = '',
		children,
		onSuccess = () => {}
	}: {
		mode?: 'create' | 'edit';
		driver?: Driver;
		mapId?: string;
		triggerClass?: string;
		children?: any;
		onSuccess?: (driver: Driver) => void;
	} = $props();

	// Validation
	$effect(() => {
		if (mode === 'edit' && !driver) {
			throw new Error('driver prop is required when mode is "edit"');
		}
	});

	// State
	const isDesktop = new MediaQuery('(min-width: 768px)');
	let open = $state(false);
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	// Form fields
	let driverName = $state('');
	let phone = $state('');
	let notes = $state('');
	let isActive = $state(true);
	let isTemporary = $state(false);
	let color = $state('');

	// Initialize form with existing data in edit mode
	$effect(() => {
		if (mode === 'edit' && driver && open) {
			driverName = driver.name;
			phone = driver.phone || '';
			notes = driver.notes || '';
			isActive = driver.active;
			isTemporary = driver.temporary;
			color = driver.color;
		}
	});

	// Reset form
	function resetForm() {
		if (mode === 'create') {
			driverName = '';
			phone = '';
			notes = '';
			isActive = true;
			isTemporary = false;
			color = '';
		} else if (driver) {
			driverName = driver.name;
			phone = driver.phone || '';
			notes = driver.notes || '';
			isActive = driver.active;
			isTemporary = driver.temporary;
			color = driver.color;
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
					<Truck class="mr-2 h-4 w-4" />
					Create Driver
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
				{driver}
				{mode}
				{mapId}
				onSuccess={(driver) => {
					open = false;
					onSuccess(driver);
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
					<Truck class="mr-2 h-4 w-4" />
					Create Driver
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
					{driver}
					{mode}
					{mapId}
					onSuccess={(driver) => {
						open = false;
						onSuccess(driver);
					}}
				/>
			</div>
		</Drawer.Content>
	</Drawer.Root>
{/if}
