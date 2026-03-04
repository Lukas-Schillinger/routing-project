<script lang="ts">
	import { ConfirmDeleteDialog } from '$lib/components/ConfirmDeleteDialog';
	import PhoneInput from '$lib/components/PhoneInput.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { ColorInput } from '$lib/components/ui/color-input';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ServiceError } from '$lib/errors';
	import { driverCreateSchema, type Driver } from '$lib/schemas/driver';
	import { driverApi } from '$lib/services/api/drivers';
	import { mapApi } from '$lib/services/api/maps';
	import { formatDate, generateRandomColor } from '$lib/utils';
	import Check from '@lucide/svelte/icons/check';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { untrack } from 'svelte';
	import {
		defaults,
		setError,
		setMessage,
		superForm
	} from 'sveltekit-superforms';
	import { zod4, zod4Client } from 'sveltekit-superforms/adapters';

	type Props = {
		mapId?: string;
		onSuccess: (driver: Driver) => void;
	} & (
		| {
				mode?: 'create';
				driver?: never;
				temporaryDriver?: boolean;
				onDelete?: never;
		  }
		| {
				mode: 'edit';
				driver: Driver;
				temporaryDriver?: never;
				onDelete?: () => Promise<void>;
		  }
	);

	let {
		mode = 'create',
		driver,
		mapId,
		temporaryDriver = false,
		onSuccess,
		onDelete
	}: Props = $props();

	const generateDriverName = () =>
		`driver-${Math.floor(Math.random() * 100000)
			.toString()
			.padStart(5, '0')}`;

	// Avoid state_referenced_locally warnings
	const initialData = untrack(() =>
		mode === 'edit' && driver
			? {
					name: driver.name,
					phone: driver.phone ?? '',
					notes: driver.notes ?? '',
					color: driver.color,
					active: driver.active,
					temporary: driver.temporary
				}
			: {
					name: temporaryDriver ? generateDriverName() : '',
					phone: '',
					notes: '',
					color: generateRandomColor(),
					active: true,
					temporary: temporaryDriver
				}
	);

	const form = superForm(defaults(initialData, zod4(driverCreateSchema)), {
		SPA: true,
		validators: zod4Client(driverCreateSchema),
		onUpdate: async ({ form }) => {
			if (!form.valid) return;

			try {
				const result =
					mode === 'create'
						? await driverApi.create(form.data)
						: await driverApi.update(driver!.id, form.data);

				if (mode === 'create' && mapId) {
					await mapApi.addDriver(mapId, result.id);
				}

				onSuccess(result);
			} catch (err) {
				const message =
					err instanceof ServiceError
						? err.message
						: 'An unexpected error occurred';
				if (err instanceof ServiceError && err.statusCode === 409) {
					setError(form, 'name', message);
				} else {
					setMessage(form, message);
				}
			}
		}
	});

	const { form: formData, message, enhance, submitting } = form;
</script>

<form method="POST" use:enhance class="space-y-4">
	<div class="space-y-4">
		<div>
			<h3 class="text-sm leading-none font-medium">
				{mode === 'create' ? 'Create New Driver' : 'Edit Driver'}
			</h3>
			<p class="mt-1 text-sm text-muted-foreground">
				{mode === 'create'
					? 'Add a new driver for your organization'
					: 'Update driver details'}
			</p>
		</div>

		{#if $message}
			<Alert.Root variant="destructive">
				<Alert.Description>{$message}</Alert.Description>
			</Alert.Root>
		{/if}

		<div class="space-y-3">
			<Form.Field {form} name="name">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Name</Form.Label>
						<Input
							{...props}
							bind:value={$formData.name}
							placeholder="e.g., John Smith"
							disabled={$submitting || temporaryDriver}
						/>
					{/snippet}
				</Form.Control>
				{#if temporaryDriver}
					<Form.Description
						>Name is auto-generated for temporary drivers</Form.Description
					>
				{/if}
				<Form.FieldErrors />
			</Form.Field>

			<div class="flex gap-2">
				<Form.Field {form} name="phone">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Phone Number</Form.Label>
							<PhoneInput
								{...props}
								bind:value={$formData.phone}
								disabled={$submitting || temporaryDriver}
							/>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field {form} name="color">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Color</Form.Label>
							<div class="flex gap-2">
								<ColorInput
									{...props}
									bind:value={$formData.color}
									disabled={$submitting}
								/>
								<Button
									type="button"
									onclick={() => ($formData.color = generateRandomColor())}
									variant="ghost"
									size="icon"
									disabled={$submitting}
									aria-label="Randomize color"
								>
									<RefreshCw class="h-4 w-4" />
								</Button>
							</div>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>

			<Form.Field {form} name="notes">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Notes</Form.Label>
						<Textarea
							{...props}
							bind:value={$formData.notes}
							placeholder="Additional information…"
							disabled={$submitting}
							rows={3}
							class="resize-none"
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
		</div>
	</div>

	{#if mode === 'edit' && driver}
		<div class="flex items-center justify-between">
			<div class="text-[11px] leading-relaxed text-muted-foreground">
				<div>Created {formatDate(driver.created_at)}</div>
				<div>Updated {formatDate(driver.updated_at)}</div>
			</div>
			<div class="flex gap-2">
				{#if onDelete}
					<ConfirmDeleteDialog
						description={`Are you sure you want to delete "${driver.name}"?`}
						onConfirm={onDelete}
					>
						{#snippet trigger({ props })}
							<Button
								{...props}
								type="button"
								variant="ghost"
								size="sm"
								disabled={$submitting}
							>
								<Trash2 class="h-4 w-4" />
								Delete
							</Button>
						{/snippet}
					</ConfirmDeleteDialog>
				{/if}
				<Form.Button size="sm" disabled={$submitting}>
					{#if $submitting}
						<Loader2 class="h-4 w-4 animate-spin" />
						Updating...
					{:else}
						<Check class="h-4 w-4" />
						Update Driver
					{/if}
				</Form.Button>
			</div>
		</div>
	{:else}
		<div class="flex justify-end">
			<Form.Button disabled={$submitting}>
				{#if $submitting}
					<Loader2 class="h-4 w-4 animate-spin" />
					Creating...
				{:else}
					<Check class="h-4 w-4" />
					Create Driver
				{/if}
			</Form.Button>
		</div>
	{/if}
</form>
