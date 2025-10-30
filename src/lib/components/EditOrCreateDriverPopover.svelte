<!-- src/lib/components/EditOrCreateDriverPopover.svelte -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Popover from '$lib/components/ui/popover';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { Driver } from '$lib/schemas/driver';
	import { ApiError } from '$lib/services/api/base';
	import { driverApi } from '$lib/services/api/drivers';
	import { Check, LoaderCircle, Pencil, Truck } from 'lucide-svelte';

	// Props
	let {
		mode = 'create',
		driver = undefined,
		triggerClass = '',
		children,
		onSuccess = () => {}
	}: {
		mode?: 'create' | 'edit';
		driver?: Driver;
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
	let open = $state(false);
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	// Form fields
	let driverName = $state('');
	let phone = $state('');
	let notes = $state('');
	let isActive = $state(true);
	let isTemporary = $state(false);

	// Initialize form with existing data in edit mode
	$effect(() => {
		if (mode === 'edit' && driver && open) {
			driverName = driver.name;
			phone = driver.phone || '';
			notes = driver.notes || '';
			isActive = driver.active;
			isTemporary = driver.temporary;
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
		} else if (driver) {
			driverName = driver.name;
			phone = driver.phone || '';
			notes = driver.notes || '';
			isActive = driver.active;
			isTemporary = driver.temporary;
		}
		error = null;
	}

	// Submit handler
	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;

		if (!driverName.trim()) {
			error = 'Driver name is required';
			return;
		}

		isSubmitting = true;

		try {
			let updatedDriver: Driver;

			if (mode === 'create') {
				updatedDriver = await driverApi.create({
					name: driverName.trim(),
					phone: phone.trim() || null,
					notes: notes.trim() || null,
					active: isActive,
					temporary: isTemporary
				});
			} else {
				updatedDriver = await driverApi.update(driver!.id, {
					name: driverName.trim(),
					phone: phone.trim() || null,
					notes: notes.trim() || null,
					active: isActive,
					temporary: isTemporary
				});
			}

			onSuccess(updatedDriver);
			open = false;
			resetForm();
		} catch (err) {
			console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} driver:`, err);

			if (err instanceof ApiError) {
				if (err.status === 409) {
					error = 'A driver with this name already exists';
				} else if (err.status === 403) {
					error = `You do not have permission to ${mode} drivers`;
				} else {
					error = err.message;
				}
			} else {
				error = 'An unexpected error occurred';
			}
		} finally {
			isSubmitting = false;
		}
	}

	// Handle open change
	function handleOpenChange(isOpen: boolean) {
		open = isOpen;
		if (!isOpen && !isSubmitting) {
			resetForm();
		}
	}
</script>

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
		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="space-y-2">
				<h3 class="text-lg font-semibold">
					{mode === 'create' ? 'Create New Driver' : 'Edit Driver'}
				</h3>
				<p class="text-sm text-muted-foreground">
					{mode === 'create' ? 'Add a new driver for your organization' : 'Update driver details'}
				</p>
			</div>

			{#if error}
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					{error}
				</div>
			{/if}

			<div class="space-y-2">
				<Label for="driver-name">Driver Name *</Label>
				<Input
					id="driver-name"
					bind:value={driverName}
					placeholder="e.g., John Smith"
					disabled={isSubmitting}
					required
				/>
			</div>

			<div class="space-y-2">
				<Label for="driver-phone">Phone Number</Label>
				<Input
					id="driver-phone"
					type="tel"
					bind:value={phone}
					placeholder="e.g., (555) 123-4567"
					disabled={isSubmitting}
				/>
			</div>

			<div class="space-y-2">
				<Label for="driver-notes">Notes</Label>
				<Textarea
					id="driver-notes"
					bind:value={notes}
					placeholder="Additional information about the driver..."
					disabled={isSubmitting}
					rows={3}
				/>
			</div>

			<div class="flex gap-2">
				<Button
					type="button"
					variant="outline"
					class="flex-1"
					onclick={() => (open = false)}
					disabled={isSubmitting}
				>
					Cancel
				</Button>
				<Button type="submit" class="flex-1" disabled={isSubmitting}>
					{#if isSubmitting}
						<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
						{mode === 'create' ? 'Creating...' : 'Updating...'}
					{:else}
						<Check class="mr-2 h-4 w-4" />
						{mode === 'create' ? 'Create Driver' : 'Update Driver'}
					{/if}
				</Button>
			</div>
		</form>
	</Popover.Content>
</Popover.Root>
