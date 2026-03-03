<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ServiceError } from '$lib/errors';
	import { createMapSchema, type Map } from '$lib/schemas/map';
	import { mapApi } from '$lib/services/api/maps';
	import { Check, Loader2 } from 'lucide-svelte';
	import { defaults, setMessage, superForm } from 'sveltekit-superforms';
	import { zod4, zod4Client } from 'sveltekit-superforms/adapters';

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

	const form = superForm(defaults(getInitialData(), zod4(createMapSchema)), {
		SPA: true,
		validators: zod4Client(createMapSchema),
		onUpdate: async ({ form }) => {
			if (!form.valid) return;

			try {
				// Convert empty strings to null for API
				const payload = {
					...form.data,
					description: form.data.description || null
				};

				const resultMap =
					mode === 'create'
						? (await mapApi.create(payload)).map
						: await mapApi.update(map!.id, payload);

				onSuccess(resultMap);
				open = false;
			} catch (err) {
				const message =
					err instanceof ServiceError
						? err.message
						: 'An unexpected error occurred';
				setMessage(form, message);
			}
		}
	});

	const { form: formData, message, enhance, submitting } = form;

	// Reset form when dialog closes
	$effect(() => {
		if (!open) Object.assign($formData, getInitialData());
	});
</script>

<form method="POST" use:enhance class="space-y-4">
	<div class="space-y-4">
		<div>
			<h3 class="text-sm leading-none font-medium">
				{mode === 'create' ? 'Create New Map' : 'Edit Map'}
			</h3>
			<p class="mt-1 text-sm text-muted-foreground">
				{mode === 'create'
					? 'Add a new map for your organization'
					: 'Update map details'}
			</p>
		</div>

		{#if $message}
			<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
				{$message}
			</div>
		{/if}

		<div class="space-y-3">
			<Form.Field {form} name="title">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Title</Form.Label>
						<Input
							{...props}
							bind:value={$formData.title}
							placeholder="e.g., Monday Deliveries"
							disabled={$submitting}
							required
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field {form} name="description">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Description</Form.Label>
						<Textarea
							{...props}
							bind:value={$formData.description}
							placeholder="Optional description…"
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

	<div class="flex gap-2">
		<Button
			type="button"
			variant="outline"
			class="flex-1"
			onclick={() => (open = false)}
			disabled={$submitting}
		>
			Cancel
		</Button>
		<Form.Button class="flex-1" disabled={$submitting}>
			{#if $submitting}
				<Loader2 class="h-4 w-4 animate-spin" />
				{mode === 'create' ? 'Creating...' : 'Updating...'}
			{:else}
				<Check class="h-4 w-4" />
				{mode === 'create' ? 'Create Map' : 'Update Map'}
			{/if}
		</Form.Button>
	</div>
</form>
