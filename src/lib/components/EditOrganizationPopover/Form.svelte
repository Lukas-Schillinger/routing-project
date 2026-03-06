<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { captureClientError, ServiceError } from '$lib/errors';
	import type { Organization } from '$lib/schemas/organization';
	import { organizationApi } from '$lib/services/api/auth';
	import Check from '@lucide/svelte/icons/check';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	// Props
	let {
		organization,
		open = $bindable(false),
		onSuccess = () => {}
	}: {
		organization: Organization;
		open: boolean;
		onSuccess?: (organization: Organization) => void;
	} = $props();

	// State
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	// Form fields
	let organizationName = $derived(organization.name);

	// Initialize form with existing data when opened
	$effect(() => {
		if (open) {
			organizationName = organization.name;
		}
	});

	// Reset form
	function resetForm() {
		organizationName = organization.name;
		error = null;
	}

	// Submit handler
	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;

		if (!organizationName.trim()) {
			error = 'Organization name is required';
			return;
		}

		isSubmitting = true;

		try {
			const updatedOrganization = await organizationApi.update(
				organization.id,
				{
					name: organizationName.trim()
				}
			);

			onSuccess(updatedOrganization as Organization);
			resetForm();
		} catch (err) {
			console.error('Error updating organization:', err);
			captureClientError(err);

			if (err instanceof ServiceError) {
				if (err.statusCode === 403) {
					error = 'You do not have permission to update this organization';
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
		<h3 class="text-lg font-semibold">Edit Organization</h3>
		<p class="text-sm text-muted-foreground">
			Update your organization details
		</p>
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="space-y-2">
		<Label for="organization-name">Organization Name *</Label>
		<Input
			id="organization-name"
			bind:value={organizationName}
			placeholder="e.g., Acme Corp"
			disabled={isSubmitting}
			required
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
				Updating...
			{:else}
				<Check class="h-4 w-4" />
				Update Organization
			{/if}
		</Button>
	</div>
</form>
