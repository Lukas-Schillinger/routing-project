<script lang="ts">
	import AddressAutocomplete from '$lib/components/AddressAutocomplete.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Popover from '$lib/components/ui/popover';
	import { Switch } from '$lib/components/ui/switch';
	import type { GeocodingFeature } from '$lib/services/mapbox-geocoding';
	import { geocodingFeatureToLocation } from '$lib/utils';
	import { Building2, Check, LoaderCircle } from 'lucide-svelte';

	// Props
	let {
		onSuccess = () => {}
	}: {
		onSuccess?: (depot: any) => void;
	} = $props();

	// State
	let open = $state(false);
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	// Form fields
	let depotName = $state('');
	let address = $state('');
	let isDefault = $state(false);
	let selectedLocation = $state<{
		feature: GeocodingFeature;
		locationId?: string;
	} | null>(null);

	// Reset form
	function resetForm() {
		depotName = '';
		address = '';
		isDefault = false;
		selectedLocation = null;
		error = null;
	}

	// Handle address selection
	function handleAddressSelect(feature: GeocodingFeature) {
		selectedLocation = { feature };
	}

	// Handle address clear
	function handleAddressClear() {
		selectedLocation = null;
	}

	// Create depot with location
	async function createDepot(feature: GeocodingFeature) {
		console.log(feature);
		const depotData = {
			name: depotName.trim(),
			default_depot: isDefault,
			location: geocodingFeatureToLocation(feature)
		};

		const response = await fetch('/api/depots', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(depotData)
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(errorData.message || `Failed to create depot: ${response.statusText}`);
		}

		return await response.json();
	}

	// Submit handler
	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;

		if (!depotName.trim()) {
			error = 'Depot name is required';
			return;
		}

		if (!selectedLocation) {
			error = 'Address is required';
			return;
		}

		isSubmitting = true;

		try {
			// Create the depot with location in one API call
			const newDepot = await createDepot(selectedLocation.feature);

			// Call success callback
			onSuccess(newDepot);

			// Close popover and reset form
			open = false;
			resetForm();
		} catch (err) {
			console.error('Error creating depot:', err);
			error = err instanceof Error ? err.message : 'Failed to create depot';
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
	<Popover.Trigger>
		<Button>
			<Building2 class="mr-2 h-4 w-4" />
			Create Depot
		</Button>
	</Popover.Trigger>
	<Popover.Content class="w-96">
		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="space-y-2">
				<h3 class="text-lg font-semibold">Create New Depot</h3>
				<p class="text-sm text-muted-foreground">Add a new depot location for your organization</p>
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
				<Label for="depot-address">Address *</Label>
				<AddressAutocomplete
					bind:value={address}
					placeholder="Search for depot address..."
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
						Creating...
					{:else}
						<Check class="mr-2 h-4 w-4" />
						Create Depot
					{/if}
				</Button>
			</div>
		</form>
	</Popover.Content>
</Popover.Root>
