<!-- src/routes/(app)/maps/[mapId]/import/components/ColumnMappingStep.svelte -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, ArrowRight } from 'lucide-svelte';
	import CsvPreviewTable from './CsvPreviewTable.svelte';

	let {
		csvHeaders,
		csvData,
		onColumnsMapped,
		onBack
	}: {
		csvHeaders: string[];
		csvData: any[];
		onColumnsMapped: (mapping: Record<string, string>) => void;
		onBack: () => void;
	} = $props();

	// Required field mappings
	let nameColumn = $state<string>('');
	let addressColumn = $state<string>('');
	let phoneColumn = $state<string>('');
	let notesColumn = $state<string>('');

	// Auto-detect likely column mappings
	$effect(() => {
		if (csvHeaders.length > 0) {
			// Auto-detect name column
			const nameCandidate = csvHeaders.find((h) =>
				/^(name|contact|customer|client)$/i.test(h.trim())
			);
			if (nameCandidate) nameColumn = nameCandidate;

			// Auto-detect address column
			const addressCandidate = csvHeaders.find((h) =>
				/^(address|addr|location|street)$/i.test(h.trim())
			);
			if (addressCandidate) addressColumn = addressCandidate;

			// Auto-detect phone column
			const phoneCandidate = csvHeaders.find((h) =>
				/^(phone|tel|telephone|mobile|cell)$/i.test(h.trim())
			);
			if (phoneCandidate) phoneColumn = phoneCandidate;

			// Auto-detect notes column
			const notesCandidate = csvHeaders.find((h) =>
				/^(notes|note|comments|comment|description)$/i.test(h.trim())
			);
			if (notesCandidate) notesColumn = notesCandidate;
		}
	});

	const canProceed = $derived(addressColumn);

	function handleNext() {
		if (!canProceed) return;

		const mapping: Record<string, string> = {};
		if (nameColumn) mapping.name = nameColumn;
		if (addressColumn) mapping.address = addressColumn;
		if (phoneColumn) mapping.phone = phoneColumn;
		if (notesColumn) mapping.notes = notesColumn;

		onColumnsMapped(mapping);
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
		<Button variant="outline" onclick={onBack}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back
		</Button>
		<Button onclick={handleNext} disabled={!canProceed}>
			Next: Review Data
			<ArrowRight class="ml-2 h-4 w-4" />
		</Button>
	</div>
</div>
