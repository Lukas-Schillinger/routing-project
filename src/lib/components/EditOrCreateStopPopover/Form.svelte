<script lang="ts">
	import AddressAutocomplete from '$lib/components/AddressAutocomplete.svelte';
	import PhoneInput from '$lib/components/PhoneInput.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ServiceError } from '$lib/errors';
	import type { LocationCreate } from '$lib/schemas/location';
	import type { StopWithLocation, UpdateStop } from '$lib/schemas/stop';
	import { stopApi } from '$lib/services/api/stops';
	import Check from '@lucide/svelte/icons/check';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
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
		open = $bindable(false),
		onSuccess = () => {}
	}: {
		mode?: 'create' | 'edit';
		stop?: StopWithLocation;
		mapId?: string;
		initialData?: InitialData;
		open: boolean;
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
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	// Form fields
	let contactName = $state('');
	let contactPhone = $state('');
	let address = $state('');
	let notes = $state('');
	let selectedLocation = $state<LocationCreate | null>(null);

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

	// Initialize form with initial data in create mode
	$effect(() => {
		if (mode === 'create' && initialData && open) {
			if (initialData.location) {
				selectedLocation = initialData.location;
				address = initialData.location.address_line_1;
			}
			contactName = initialData.contactName ?? '';
			contactPhone = initialData.contactPhone ?? '';
			notes = initialData.notes ?? '';
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

		if (mode === 'create' && !selectedLocation) {
			error = 'Address is required';
			return;
		}

		isSubmitting = true;

		try {
			let updatedStop: StopWithLocation;

			if (mode === 'create') {
				updatedStop = await stopApi.create({
					map_id: mapId!,
					location: selectedLocation!,
					contact_name: contactName.trim() || null,
					contact_phone: contactPhone.trim() || null,
					notes: notes.trim() || null
				});
			} else {
				const updateData: UpdateStop = {
					contact_name: contactName.trim() || null,
					contact_phone: contactPhone.trim() || null,
					notes: notes.trim() || null
				};

				if (selectedLocation) {
					updateData.location = selectedLocation;
				}

				updatedStop = await stopApi.update(stop!.stop.id, updateData);
			}

			onSuccess(updatedStop);
			resetForm();
		} catch (err) {
			console.error(
				`Error ${mode === 'create' ? 'creating' : 'updating'} stop:`,
				err
			);

			if (err instanceof ServiceError) {
				error = err.message;
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
			{mode === 'create' ? 'Create Stop' : 'Edit Stop'}
		</h3>
		<p class="text-sm text-muted-foreground">
			{mode === 'create' ? 'Add a new delivery stop' : 'Update stop details'}
		</p>
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="space-y-2">
		<Label for="contact-name">Contact Name</Label>
		<Input
			id="contact-name"
			bind:value={contactName}
			placeholder="e.g., John Doe"
			disabled={isSubmitting}
		/>
	</div>

	<div class="space-y-2">
		<Label for="contact-phone">Contact Phone</Label>
		<PhoneInput
			id="contact-phone"
			bind:value={contactPhone}
			disabled={isSubmitting}
		/>
	</div>

	<div class="space-y-2">
		<Label for="stop-address">Address</Label>
		<AddressAutocomplete
			bind:value={address}
			placeholder={mode === 'create'
				? 'Search for address…'
				: 'Search to update address…'}
			onSelect={handleAddressSelect}
			onClear={handleAddressClear}
			disabled={isSubmitting}
		/>
	</div>

	<div class="space-y-2">
		<Label for="notes">Notes</Label>
		<Textarea
			id="notes"
			bind:value={notes}
			placeholder="Add any delivery notes…"
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
				<LoaderCircle class="h-4 w-4 animate-spin" />
				{mode === 'create' ? 'Creating...' : 'Updating...'}
			{:else}
				<Check class="h-4 w-4" />
				{mode === 'create' ? 'Create Stop' : 'Update Stop'}
			{/if}
		</Button>
	</div>
</form>
