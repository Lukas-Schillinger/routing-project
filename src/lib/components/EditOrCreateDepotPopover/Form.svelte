<script lang="ts">
	import AddressAutocomplete from '$lib/components/AddressAutocomplete.svelte';
	import { ConfirmDeleteDialog } from '$lib/components/ConfirmDeleteDialog';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { ServiceError } from '$lib/errors';
	import type { DepotWithLocationJoin } from '$lib/schemas/depot';
	import type { LocationCreate } from '$lib/schemas/location';
	import { depotApi } from '$lib/services/api/depots';
	import { formatDate } from '$lib/utils';
	import Check from '@lucide/svelte/icons/check';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	// Props
	let {
		mode = 'create',
		depot = undefined,
		open = $bindable(false),
		onSuccess = () => {},
		onDelete
	}: {
		mode?: 'create' | 'edit';
		depot?: DepotWithLocationJoin;
		open: boolean;
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
				const updateData: {
					name: string;
					default_depot: boolean;
					location?: LocationCreate;
				} = {
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
			console.error(
				`Error ${mode === 'create' ? 'creating' : 'updating'} depot:`,
				err
			);

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
		<Alert.Root variant="destructive">
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
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
				? 'Search for depot address…'
				: 'Search to update address…'}
			onSelect={handleAddressSelect}
			onClear={handleAddressClear}
			disabled={isSubmitting}
		/>
	</div>

	<div class="flex items-center justify-between space-x-2">
		<Label for="default-depot" class="flex-1 cursor-pointer"
			>Set as default depot</Label
		>
		<Switch
			id="default-depot"
			bind:checked={isDefault}
			disabled={isSubmitting}
		/>
	</div>

	{#if mode === 'edit' && depot}
		<div class="flex items-end justify-between">
			<div class="text-[11px] leading-relaxed text-muted-foreground">
				<div>Created {formatDate(depot.depot.created_at)}</div>
				<div>Updated {formatDate(depot.depot.updated_at)}</div>
			</div>
			<div class="flex gap-2">
				{#if onDelete}
					<ConfirmDeleteDialog
						description={`Are you sure you want to delete "${depot.depot.name}"?`}
						onConfirm={onDelete}
					>
						{#snippet trigger({ props })}
							<Button
								{...props}
								type="button"
								variant="ghost"
								size="sm"
								disabled={isSubmitting}
							>
								<Trash2 class="h-4 w-4" />
								Delete
							</Button>
						{/snippet}
					</ConfirmDeleteDialog>
				{/if}
				<Button type="submit" size="sm" disabled={isSubmitting}>
					{#if isSubmitting}
						<LoaderCircle class="h-4 w-4 animate-spin" />
						Updating...
					{:else}
						<Check class="h-4 w-4" />
						Update Depot
					{/if}
				</Button>
			</div>
		</div>
	{:else}
		<div class="flex justify-end">
			<Button type="submit" disabled={isSubmitting}>
				{#if isSubmitting}
					<LoaderCircle class="h-4 w-4 animate-spin" />
					Creating...
				{:else}
					<Check class="h-4 w-4" />
					Create Depot
				{/if}
			</Button>
		</div>
	{/if}
</form>
