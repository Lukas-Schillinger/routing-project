<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ServiceError } from '$lib/errors';
	import { createMapSchema, type Map } from '$lib/schemas/map';
	import { mapApi } from '$lib/services/api/maps';
	import { Check, Loader2 } from 'lucide-svelte';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';

	let {
		mode = 'create',
		map,
		open = $bindable(false),
		onSuccess = () => {}
	}: {
		mode?: 'create' | 'edit';
		map?: Map;
		open: boolean;
		onSuccess?: (map: Map) => void;
	} = $props();

	// Use empty strings for form inputs - schema transforms to null on submit
	const getInitialData = () => ({
		title: mode === 'edit' && map ? map.title : '',
		description: ''
	});

	const form = superForm(defaults(getInitialData(), zod(createMapSchema)), {
		SPA: true,
		validators: zod(createMapSchema),
		onUpdate: async ({ form }) => {
			if (!form.valid) return;

			try {
				// Convert empty strings to null for API
				const payload = {
					...form.data,
					description: form.data.description || null
				};

				const result =
					mode === 'create' ? await mapApi.create(payload) : await mapApi.update(map!.id, payload);

				onSuccess(result.map);
				open = false;
			} catch (err) {
				if (err instanceof ServiceError) {
					if (err.statusCode === 409) form.errors.title = ['A map with this title already exists'];
					else
						form.message =
							err.statusCode === 403 ? `You do not have permission to ${mode} maps` : err.message;
				} else {
					form.message = 'An unexpected error occurred';
				}
			}
		}
	});

	const { form: formData, errors, message, enhance, submitting } = form;

	// Reset form when dialog closes
	$effect(() => {
		if (!open) Object.assign($formData, getInitialData());
	});
</script>

<form method="POST" use:enhance class="space-y-4">
	<Field.Set>
		<Field.Legend>{mode === 'create' ? 'Create New Map' : 'Edit Map'}</Field.Legend>
		<Field.Description>
			{mode === 'create' ? 'Add a new map for your organization' : 'Update map details'}
		</Field.Description>

		{#if $message}
			<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{$message}</div>
		{/if}

		<Field.Group>
			<Field.Field data-invalid={$errors.title ? true : undefined}>
				<Field.Label for="map-title">Title</Field.Label>
				<Input
					id="map-title"
					bind:value={$formData.title}
					placeholder="e.g., Monday Deliveries"
					disabled={$submitting}
					aria-invalid={$errors.title ? true : undefined}
					required
				/>
				{#if $errors.title}<Field.Error>{$errors.title[0]}</Field.Error>{/if}
			</Field.Field>

			<Field.Field data-invalid={$errors.description ? true : undefined}>
				<Field.Label for="map-description">Description</Field.Label>
				<Textarea
					id="map-description"
					bind:value={$formData.description}
					placeholder="Optional description..."
					disabled={$submitting}
					rows={3}
					class="resize-none"
				/>
				{#if $errors.description}<Field.Error>{$errors.description[0]}</Field.Error>{/if}
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
				{mode === 'create' ? 'Create Map' : 'Update Map'}
			{/if}
		</Button>
	</Field.Field>
</form>
