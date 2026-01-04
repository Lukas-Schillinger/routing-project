<script lang="ts">
	import PhoneInput from '$lib/components/PhoneInput.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { driverCreateSchema, type Driver, type DriverCreate } from '$lib/schemas/driver';
	import { ServiceError } from '$lib/errors';
	import { driverApi } from '$lib/services/api/drivers';
	import { mapApi } from '$lib/services/api/maps';
	import { generateRandomColor } from '$lib/utils';
	import { Check, Loader2, RefreshCw } from 'lucide-svelte';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';

	let {
		mode = 'create',
		driver,
		mapId,
		temporaryDriver = false,
		open = $bindable(false),
		onSuccess = () => {}
	}: {
		mode?: 'create' | 'edit';
		driver?: Driver;
		mapId?: string;
		temporaryDriver?: boolean;
		open: boolean;
		onSuccess?: (driver: Driver) => void;
	} = $props();

	const generateDriverName = () =>
		`driver-${Math.floor(Math.random() * 100000)
			.toString()
			.padStart(5, '0')}`;

	// Use empty strings for form inputs - schema transforms to null on submit
	const getInitialData = () => ({
		name: mode === 'edit' && driver ? driver.name : temporaryDriver ? generateDriverName() : '',
		phone: mode === 'edit' && driver ? (driver.phone ?? '') : '',
		notes: mode === 'edit' && driver ? (driver.notes ?? '') : '',
		color: mode === 'edit' && driver ? driver.color : generateRandomColor(),
		active: mode === 'edit' && driver ? driver.active : true,
		temporary: mode === 'edit' && driver ? driver.temporary : temporaryDriver
	});

	const form = superForm(defaults(getInitialData(), zod(driverCreateSchema)), {
		SPA: true,
		validators: zod(driverCreateSchema),
		onUpdate: async ({ form }) => {
			if (!form.valid) return;

			try {
				// Convert empty strings to null for API
				const payload = {
					...form.data,
					phone: form.data.phone || null,
					notes: form.data.notes || null
				};

				const result =
					mode === 'create'
						? await driverApi.create(payload)
						: await driverApi.update(driver!.id, payload);

				if (mode === 'create' && mapId) {
					await mapApi.addDriver(mapId, result.id);
				}

				onSuccess(result);
				open = false;
			} catch (err) {
				if (err instanceof ServiceError) {
					if (err.statusCode === 409) form.errors.name = ['A driver with this name already exists'];
					else
						form.message =
							err.statusCode === 403 ? `You do not have permission to ${mode} drivers` : err.message;
				} else {
					form.message = 'An unexpected error occurred';
				}
			}
		}
	});

	const { form: formData, errors, message, enhance, submitting } = form;

	// Reset form when dialog opens
	$effect(() => {
		if (open) Object.assign($formData, getInitialData());
	});
</script>

<form method="POST" use:enhance class="space-y-4">
	<Field.Set>
		<Field.Legend>{mode === 'create' ? 'Create New Driver' : 'Edit Driver'}</Field.Legend>
		<Field.Description>
			{mode === 'create' ? 'Add a new driver for your organization' : 'Update driver details'}
		</Field.Description>

		{#if $message}
			<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{$message}</div>
		{/if}

		<Field.Group>
			<Field.Field data-invalid={$errors.name ? true : undefined}>
				<Field.Label for="driver-name">Driver Name</Field.Label>
				<Input
					id="driver-name"
					bind:value={$formData.name}
					placeholder="e.g., John Smith"
					disabled={$submitting || temporaryDriver}
					aria-invalid={$errors.name ? true : undefined}
					required
				/>
				{#if temporaryDriver}
					<Field.Description>Name is auto-generated for temporary drivers</Field.Description>
				{/if}
				{#if $errors.name}<Field.Error>{$errors.name[0]}</Field.Error>{/if}
			</Field.Field>

			<Field.Field data-invalid={$errors.phone ? true : undefined}>
				<Field.Label for="driver-phone">Phone Number</Field.Label>
				<PhoneInput
					id="driver-phone"
					bind:value={$formData.phone}
					disabled={$submitting || temporaryDriver}
				/>
				{#if $errors.phone}<Field.Error>{$errors.phone[0]}</Field.Error>{/if}
			</Field.Field>

			<Field.Field data-invalid={$errors.color ? true : undefined}>
				<Field.Label for="driver-color">Color</Field.Label>
				<div class="flex gap-2">
					<Input
						type="color"
						id="driver-color"
						bind:value={$formData.color}
						disabled={$submitting}
						class="h-9 w-full cursor-pointer p-1"
					/>
					<Button
						type="button"
						onclick={() => ($formData.color = generateRandomColor())}
						variant="ghost"
						size="icon"
						disabled={$submitting}
					>
						<RefreshCw class="h-4 w-4" />
					</Button>
				</div>
				{#if $errors.color}<Field.Error>{$errors.color[0]}</Field.Error>{/if}
			</Field.Field>

			<Field.Field data-invalid={$errors.notes ? true : undefined}>
				<Field.Label for="driver-notes">Notes</Field.Label>
				<Textarea
					id="driver-notes"
					bind:value={$formData.notes}
					placeholder="Additional information..."
					disabled={$submitting}
					rows={3}
					class="resize-none"
				/>
				{#if $errors.notes}<Field.Error>{$errors.notes[0]}</Field.Error>{/if}
			</Field.Field>
		</Field.Group>
	</Field.Set>

	<Field.Field orientation="horizontal">
		<Button
			type="button"
			variant="outline"
			class="flex-1"
			onclick={() => (open = false)}
			disabled={$submitting}
		>
			Cancel
		</Button>
		<Button type="submit" class="flex-1" disabled={$submitting}>
			{#if $submitting}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{mode === 'create' ? 'Creating...' : 'Updating...'}
			{:else}
				<Check class="mr-2 h-4 w-4" />
				{mode === 'create' ? 'Create Driver' : 'Update Driver'}
			{/if}
		</Button>
	</Field.Field>
</form>
