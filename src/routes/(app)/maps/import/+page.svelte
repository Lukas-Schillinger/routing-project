<!-- src/routes/(app)/maps/[mapId]/import/+page.svelte -->
<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
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
		{ number: 3, title: 'Review & Import', icon: FileText }
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
			// Transform CSV data based on column mapping
			const transformedData = csvData.map((row) => {
				const transformed: Record<string, string> = {};
				for (const [field, columnName] of Object.entries(columnMapping)) {
					if (columnName) {
						transformed[field] = row[columnName] || '';
					}
				}
				return transformed;
			});

			// Create a temporary file with the mapped data
			const csvContent = [
				Object.keys(columnMapping).join(','),
				...transformedData.map((row) =>
					Object.keys(columnMapping)
						.map((field) => {
							const value = row[field] || '';
							// Escape quotes and wrap in quotes if contains comma
							return value.includes(',') || value.includes('"')
								? `"${value.replace(/"/g, '""')}"`
								: value;
						})
						.join(',')
				)
			].join('\n');

			const blob = new Blob([csvContent], { type: 'text/csv' });
			const file = new File([blob], selectedFile.name, { type: 'text/csv' });

			// Call geocoding API
			const formData = new FormData();
			formData.append('csvFile', file);

			const response = await fetch('/api/maps/geocode-csv', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to geocode addresses');
			}

			const data = await response.json();
			geocodedResults = data;
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
		<CardHeader>
			<CardTitle>Import CSV Stops</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
				{#each steps as step, index}
					<div class="flex items-center">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full border-2
                            {currentStep >= step.number
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-muted-foreground'}"
						>
							{#if currentStep > step.number}
								✓
							{:else}
								{@const Icon = step.icon}
								<Icon class="h-4 w-4" />
							{/if}
						</div>
						<span class="ml-2 text-sm font-medium">{step.title}</span>
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
