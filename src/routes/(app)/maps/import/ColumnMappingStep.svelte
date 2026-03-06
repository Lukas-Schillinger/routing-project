<script lang="ts">
	import { captureClientError } from '$lib/errors';
	import { createImportRecord, type ImportState } from '$lib/schemas/import';
	import { geocodingApi } from '$lib/services/api';
	import { geocodingFeatureToLocation } from '$lib/utils';
	import CsvPreviewTable from './CsvPreviewTable.svelte';

	let {
		importState = $bindable(),
		onNext,
		onCanProceedChange
	}: {
		importState: ImportState;
		onNext?: () => void;
		onCanProceedChange?: (canProceed: boolean) => void;
	} = $props();

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

	const canProceed = $derived(!!addressColumn);

	// Notify parent when canProceed changes
	$effect(() => {
		onCanProceedChange?.(canProceed);
	});

	export async function handleNext() {
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

			// Advance to review step (keep rawRows for back navigation)
			importState.step = 3;
			onNext?.();
		} catch (error) {
			console.error('Geocoding error:', error);
			captureClientError(error);
			alert('Failed to geocode addresses. Please try again.');
		} finally {
			importState.isProcessing = false;
		}
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
		<div
			class="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground"
		>
			Address field is required to proceed.
		</div>
	{/if}
</div>
