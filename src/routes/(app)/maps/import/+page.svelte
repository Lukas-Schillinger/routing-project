<script lang="ts">
	import { goto } from '$app/navigation';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import { Button } from '$lib/components/ui/button';
	import { createImportState, type ImportState } from '$lib/schemas/import';
	import { mapApi } from '$lib/services/api';
	import { FileText, Settings, Upload } from 'lucide-svelte';
	import type { PageData } from './$types';

	import ColumnMappingStep from './ColumnMappingStep.svelte';
	import FileUploadStep from './FileUploadStep.svelte';
	import GeocodeReviewStep from './GeocodeReviewStep.svelte';

	let { data }: { data: PageData } = $props();

	let importState = $state<ImportState>(createImportState());
	let isCreating = $state(false);

	const steps = [
		{ number: 1, title: 'Upload CSV', icon: Upload },
		{ number: 2, title: 'Map Columns', icon: Settings },
		{ number: 3, title: 'Review', icon: FileText }
	];

	async function createEmptyMap() {
		try {
			isCreating = true;
			const { map } = await mapApi.create({
				title: `Map ${new Date().toLocaleDateString()}`
			});
			await goto(`/maps/${map.id}`);
		} catch (error) {
			console.error('Failed to create map:', error);
			alert('Failed to create map. Please try again.');
		} finally {
			isCreating = false;
		}
	}

	async function handleImport() {
		const validRecords = importState.records.filter(
			(r) => r.status === 'success' || r.status === 'edited'
		);

		const stops = validRecords.map((record) => ({
			location: record.location!,
			contact_name: record.raw.name,
			contact_phone: record.raw.phone,
			notes: record.raw.notes
		}));

		const title =
			importState.file?.name.replace('.csv', '') ?? `Map ${new Date().toLocaleDateString()}`;
		const res = await mapApi.create({
			title,
			stops
		});

		goto(`/maps/${res.map.id}`);
	}
</script>

<div class="space-y-6">
	<!-- Progress Steps -->
	<Card>
		<CardContent>
			<div class="grid grid-cols-3">
				{#each steps as step}
					<div class="flex justify-center first:justify-start last:justify-end">
						<div class="flex flex-col items-center">
							<div
								class="flex size-8 items-center justify-center rounded-full border-2
								{importState.step > step.number
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-muted-foreground'}
								{importState.step === step.number ? 'border-primary bg-primary/45' : ''}"
							>
								{#if importState.step > step.number}
									✓
								{:else}
									{@const Icon = step.icon}
									<Icon class="size-4" />
								{/if}
							</div>
							<div class="text-center text-sm font-medium">{step.title}</div>
						</div>
					</div>
				{/each}
			</div>
			<Progress value={((importState.step - 1) / (steps.length - 1)) * 100} class="mt-4" />
		</CardContent>
	</Card>

	<!-- Step Content -->
	{#if importState.step === 1}
		<Button class="w-full" onclick={createEmptyMap} variant="outline" disabled={isCreating}>
			{isCreating ? 'Creating...' : 'Create empty map'}
		</Button>
		<FileUploadStep bind:importState />
	{:else if importState.step === 2}
		<ColumnMappingStep bind:importState />
	{:else if importState.step === 3}
		<GeocodeReviewStep bind:importState onImport={handleImport} />
	{/if}
</div>
