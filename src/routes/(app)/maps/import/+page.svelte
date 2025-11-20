<!-- src/routes/(app)/maps/[mapId]/import/+page.svelte -->
<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import type { GeocodingFeature } from '$lib/services/external/mapbox';
	import type { GeocodeCSVResult } from '$lib/services/server/csv-import.service';
	import { FileText, Settings, Upload } from 'lucide-svelte';
	import { getContext } from 'svelte';
	import type { PageData } from './$types';

	import ColumnMappingStep from './ColumnMappingStep.svelte';
	import FileUploadStep from './FileUploadStep.svelte';
	import GeocodeReviewStep from './GeocodeReviewStep.svelte';

	let { data }: { data: PageData } = $props();

	// Wizard state
	let currentStep = $state(1);
	let csvData = $state<any[]>([]);
	let csvHeaders = $state<string[]>([]);
	let columnMapping = $state<Record<string, string>>({});
	let selectedFile = $state<File | null>(null);
	let geocodedResults = $state<GeocodeCSVResult[]>([]);
	let isGeocoding = $state(false);

	// Set page header
	const pageHeaderContext = getContext<{ set: (header: any) => void }>('pageHeader');
	if (pageHeaderContext) {
		pageHeaderContext.set({
			title: 'Create Map'
		});
	}

	const steps = [
		{ number: 1, title: 'Upload CSV', icon: Upload },
		{ number: 2, title: 'Map Columns', icon: Settings },
		{ number: 3, title: 'Geocode', icon: FileText }
	];

	function handleFileUploaded(file: File, headers: string[], rows: any[]) {
		selectedFile = file;
		csvHeaders = headers;
		csvData = rows;
		currentStep = 2;
	}

	async function handleColumnsMapped(mapping: Record<string, string>) {
		columnMapping = mapping;
		currentStep = 3;

		// Start geocoding
		await geocodeAddresses();
	}

	async function geocodeAddresses() {
		if (!selectedFile) return;

		isGeocoding = true;
		geocodedResults = [];

		try {
			// Extract addresses based on column mapping
			const addressColumn = columnMapping['address'];
			if (!addressColumn) {
				throw new Error('Address column not mapped');
			}

			const addresses = csvData.map((row) => row[addressColumn] || '');

			// Call geocoding API
			const response = await fetch('/api/geocoding/batch', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ addresses })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to geocode addresses');
			}

			const data: Array<{ original: string; geocoded: GeocodingFeature | null }> =
				await response.json();

			// Map back to GeocodeCSVResult
			geocodedResults = csvData.map((row, index) => {
				const geocodedItem = data[index];

				return {
					name: columnMapping['name'] ? row[columnMapping['name']] : null,
					raw_address: geocodedItem.original,
					phone: columnMapping['phone'] ? row[columnMapping['phone']] : null,
					notes: columnMapping['notes'] ? row[columnMapping['notes']] : null,
					feature: geocodedItem.geocoded
				};
			});
		} catch (error) {
			console.error('Geocoding error:', error);
			alert('Failed to geocode addresses. Please try again.');
			currentStep = 2; // Go back to mapping step
		} finally {
			isGeocoding = false;
		}
	}

	async function handleImport(results: GeocodeCSVResult[]) {
		// TODO: Implement actual import logic
		console.log('Importing results:', results);
		alert(`Import functionality coming soon! Would import ${results.length} stops.`);
	}
</script>

<div class="space-y-6">
	<!-- Progress Steps -->
	<Card>
		<CardContent>
			<div class="grid grid-cols-3">
				{#each steps as step, index}
					<div class="flex justify-center first:justify-start last:justify-end">
						<div class="flex flex-col items-center">
							<div
								class="flex size-8 items-center justify-center rounded-full border-2
	                            {currentStep > step.number
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-muted-foreground'}
								{currentStep == step.number ? 'border-primary bg-primary/45 ' : ''}
									"
							>
								{#if currentStep > step.number}
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
			<Progress value={((currentStep - 1) / (steps.length - 1)) * 100} class="mt-4" />
		</CardContent>
	</Card>

	<!-- Step Content -->
	{#if currentStep === 1}
		<FileUploadStep onFileUploaded={handleFileUploaded} />
	{:else if currentStep === 2}
		<ColumnMappingStep
			{csvHeaders}
			{csvData}
			onColumnsMapped={handleColumnsMapped}
			onBack={() => (currentStep = 1)}
		/>
	{:else if currentStep === 3}
		<GeocodeReviewStep
			bind:geocodedResults
			{isGeocoding}
			onBack={() => (currentStep = 2)}
			onImport={handleImport}
		/>
	{/if}
</div>
