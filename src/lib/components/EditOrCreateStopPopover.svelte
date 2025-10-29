<!-- src/lib/components/EditOrCreateStopPopover.svelte -->
<script lang="ts">
	import AddressAutocomplete from '$lib/components/AddressAutocomplete.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Popover from '$lib/components/ui/popover';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { LocationCreate } from '$lib/schemas/location';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { ApiError } from '$lib/services/api/base';
	import { stopApi } from '$lib/services/api/stops';
	import { Check, LoaderCircle, Pencil, Plus } from 'lucide-svelte';

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
	let open = $state(false);
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
			address = loc.address_line1;
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
			address = stop.location.address_line1;
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
				const updateData: any = {
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
			open = false;
			resetForm();
		} catch (err) {
			console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} stop:`, err);

			if (err instanceof ApiError) {
				if (err.status === 403) {
					error = `You do not have permission to ${mode === 'create' ? 'create' : 'edit'} stops`;
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
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					{error}
				</div>
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
				<Input
					id="contact-phone"
					bind:value={contactPhone}
					placeholder="e.g., (555) 123-4567"
					disabled={isSubmitting}
				/>
			</div>

			<div class="space-y-2">
				<Label for="stop-address">
					Address {mode === 'edit' ? '(optional - leave unchanged if empty)' : ''}
				</Label>
				<AddressAutocomplete
					bind:value={address}
					placeholder={mode === 'create' ? 'Search for address...' : 'Search to update address...'}
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
					placeholder="Add any delivery notes..."
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
						{mode === 'create' ? 'Create Stop' : 'Update Stop'}
					{/if}
				</Button>
			</div>
		</form>
	</Popover.Content>
</Popover.Root>
