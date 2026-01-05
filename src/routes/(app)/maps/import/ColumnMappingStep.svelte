<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { createImportRecord, type ImportState } from '$lib/schemas/import';
	import { geocodingApi } from '$lib/services/api';
	import { geocodingFeatureToLocation } from '$lib/utils';
	import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-svelte';
	import CsvPreviewTable from './CsvPreviewTable.svelte';

	let { importState = $bindable() }: { importState: ImportState } = $props();

	// Column mappings
	let nameColumn = $state<string>('');
	let addressColumn = $state<string>('');
	let phoneColumn = $state<string>('');
	let notesColumn = $state<string>('');

	const csvHeaders = $derived(importState.file?.headers ?? []);
	const csvData = $derived(importState.rawRows ?? []);

	// Auto-detect likely column mappings
	$effect(() => {
		if (csvHeaders.length > 0) {
			const nameCandidate = csvHeaders.find((h) =>
				/^(name|contact|customer|client)$/i.test(h.trim())
			);
			if (nameCandidate) nameColumn = nameCandidate;

			const addressCandidate = csvHeaders.find((h) =>
				/^(address|addr|location|street)$/i.test(h.trim())
			);
			if (addressCandidate) addressColumn = addressCandidate;

			const phoneCandidate = csvHeaders.find((h) =>
				/^(phone|tel|telephone|mobile|cell)$/i.test(h.trim())
			);
			if (phoneCandidate) phoneColumn = phoneCandidate;

			const notesCandidate = csvHeaders.find((h) =>
				/^(notes|note|comments|comment|description)$/i.test(h.trim())
			);
			if (notesCandidate) notesColumn = notesCandidate;
		}
	});

	const canProceed = $derived(addressColumn);

	async function handleNext() {
		if (!canProceed || !importState.rawRows) return;

		// Store mapping
		importState.mapping = {
			name: nameColumn || null,
			address: addressColumn,
			phone: phoneColumn || null,
			notes: notesColumn || null
		};

		importState.isProcessing = true;

		try {
			// Create records with raw values
			importState.records = importState.rawRows.map((row) =>
				createImportRecord({
					name: nameColumn ? row[nameColumn] || null : null,
					address: row[addressColumn] || '',
					phone: phoneColumn ? row[phoneColumn] || null : null,
					notes: notesColumn ? row[notesColumn] || null : null
				})
			);

			// Batch geocode all addresses
			const addresses = importState.records.map((r) => r.raw.address);
			const results = await geocodingApi.batch(addresses);

			// Update records with LocationCreate
			results.forEach((result, i) => {
				const record = importState.records[i];
				if (result.geocoded) {
					record.location = geocodingFeatureToLocation(result.geocoded);
					record.status = 'success';
				} else {
					record.status = 'failed';
				}
			});

			// Clean up temp data and advance
			importState.rawRows = undefined;
			importState.step = 3;
		} catch (error) {
			console.error('Geocoding error:', error);
			alert('Failed to geocode addresses. Please try again.');
		} finally {
			importState.isProcessing = false;
		}
	}

	function handleBack() {
		importState.step = 1;
	}
</script>

<div class="space-y-6">
	<!-- Preview Table with inline mapping -->
	<CsvPreviewTable
		{csvData}
		{csvHeaders}
		bind:nameColumn
		bind:addressColumn
		bind:phoneColumn
		bind:notesColumn
		maxRows={5}
	/>

	{#if !canProceed}
		<div class="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
			Address field is required to proceed.
		</div>
	{/if}

	<!-- Navigation -->
	<div class="flex justify-between">
		<Button variant="outline" onclick={handleBack} disabled={importState.isProcessing}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back
		</Button>
		<Button onclick={handleNext} disabled={!canProceed || importState.isProcessing}>
			{#if importState.isProcessing}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				Geocoding...
			{:else}
				Next: Review
				<ArrowRight class="ml-2 h-4 w-4" />
			{/if}
		</Button>
	</div>
</div>
