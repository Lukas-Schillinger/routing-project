<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Popover from '$lib/components/ui/popover';
	import { Switch } from '$lib/components/ui/switch';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { Driver } from '$lib/schemas/driver';
	import { ApiError } from '$lib/services/api/base';
	import { driverApi } from '$lib/services/api/drivers';
	import { Check, LoaderCircle, Truck } from 'lucide-svelte';

	// Props
	let {
		onSuccess = () => {}
	}: {
		onSuccess?: (driver: Driver) => void;
	} = $props();

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

	// Reset form
	function resetForm() {
		driverName = '';
		phone = '';
		notes = '';
		isActive = true;
		isTemporary = false;
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
			// Create the driver using the API service
			const newDriver = await driverApi.create({
				name: driverName.trim(),
				phone: phone.trim() || null,
				notes: notes.trim() || null,
				active: isActive,
				temporary: isTemporary
			});

			// Call success callback
			onSuccess(newDriver);

			// Close popover and reset form
			open = false;
			resetForm();
		} catch (err) {
			console.error('Error creating driver:', err);

			if (err instanceof ApiError) {
				// Handle API errors with status codes
				if (err.status === 409) {
					error = 'A driver with this name already exists';
				} else if (err.status === 403) {
					error = 'You do not have permission to create drivers';
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
	<Popover.Trigger>
		<Button>
			<Truck class="mr-2 h-4 w-4" />
			Create Driver
		</Button>
	</Popover.Trigger>
	<Popover.Content class="w-96">
		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="space-y-2">
				<h3 class="text-lg font-semibold">Create New Driver</h3>
				<p class="text-sm text-muted-foreground">Add a new driver for your organization</p>
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

			<div class="space-y-3">
				<div class="flex items-center justify-between space-x-2">
					<Label for="active-driver" class="flex-1 cursor-pointer">Active driver</Label>
					<Switch id="active-driver" bind:checked={isActive} disabled={isSubmitting} />
				</div>

				<div class="flex items-center justify-between space-x-2">
					<Label for="temporary-driver" class="flex-1 cursor-pointer">Temporary driver</Label>
					<Switch id="temporary-driver" bind:checked={isTemporary} disabled={isSubmitting} />
				</div>
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
						Create Driver
					{/if}
				</Button>
			</div>
		</form>
	</Popover.Content>
</Popover.Root>
