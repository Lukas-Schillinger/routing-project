<script lang="ts">
	import AddressAutocomplete from '$lib/components/AddressAutocomplete.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { ServiceError } from '$lib/errors';
	import type { DepotWithLocationJoin } from '$lib/schemas/depot';
	import type { LocationCreate } from '$lib/schemas/location';
	import { depotApi } from '$lib/services/api/depots';
	import { Check, LoaderCircle } from 'lucide-svelte';

	// Props
	let {
		mode = 'create',
		depot = undefined,
		open = $bindable(false),
		onSuccess = () => {}
	}: {
		mode?: 'create' | 'edit';
		depot?: DepotWithLocationJoin;
		open: boolean;
		onSuccess?: (depot: DepotWithLocationJoin) => void;
	} = $props();

	// Validation
	$effect(() => {
		if (mode === 'edit' && !depot) {
			throw new Error('depot prop is required when mode is "edit"');
		}
	});

	// State
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

	// Handle address selection
	function handleAddressSelect(location: LocationCreate) {
		selectedLocation = location;
	}

	// Handle address clear
	function handleAddressClear() {
		selectedLocation = null;
	}

	// Submit handler
	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;

		if (!depotName.trim()) {
			error = 'Depot name is required';
			return;
		}

		if (mode === 'create' && !selectedLocation) {
			error = 'Address is required';
			return;
		}

		isSubmitting = true;

		try {
			let updatedDepot: DepotWithLocationJoin;

			if (mode === 'create') {
				updatedDepot = await depotApi.create({
					name: depotName.trim(),
					default_depot: isDefault,
					location: selectedLocation!
				});
			} else {
				const updateData: any = {
					name: depotName.trim(),
					default_depot: isDefault
				};

				if (selectedLocation) {
					updateData.location = selectedLocation;
				}

				updatedDepot = await depotApi.update(depot!.depot.id, updateData);
			}

			onSuccess(updatedDepot);
			resetForm();
		} catch (err) {
			console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} depot:`, err);

			if (err instanceof ServiceError) {
				if (err.statusCode === 409) {
					error = 'A depot with this name already exists';
				} else if (err.statusCode === 403) {
					error = `You do not have permission to ${mode} depots`;
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
</script>

<form onsubmit={handleSubmit} class="space-y-4">
	<div class="space-y-2">
		<h3 class="text-lg font-semibold">
			{mode === 'create' ? 'Create New Depot' : 'Edit Depot'}
		</h3>
		<p class="text-sm text-muted-foreground">
			{mode === 'create'
				? 'Add a new depot location for your organization'
				: 'Update depot details'}
		</p>
	</div>

	{#if error}
		<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
			{error}
		</div>
	{/if}

	<div class="space-y-2">
		<Label for="depot-name">Depot Name *</Label>
		<Input
			id="depot-name"
			bind:value={depotName}
			placeholder="e.g., Main Warehouse"
			disabled={isSubmitting}
			required
		/>
	</div>

	<div class="space-y-2">
		<Label for="depot-address">Address</Label>
		<AddressAutocomplete
			bind:value={address}
			placeholder={mode === 'create'
				? 'Search for depot address...'
				: 'Search to update address...'}
			onSelect={handleAddressSelect}
			onClear={handleAddressClear}
			disabled={isSubmitting}
		/>
	</div>

	<div class="flex items-center justify-between space-x-2">
		<Label for="default-depot" class="flex-1 cursor-pointer">Set as default depot</Label>
		<Switch id="default-depot" bind:checked={isDefault} disabled={isSubmitting} />
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
				{mode === 'create' ? 'Create Depot' : 'Update Depot'}
			{/if}
		</Button>
	</div>
</form>
