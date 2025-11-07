<!-- src/routes/(app)/maps/[mapId]/import/components/ColumnMappingStep.svelte -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { ArrowLeft, ArrowRight, Settings } from 'lucide-svelte';
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

	const requiredFields = [
		{ key: 'name', label: 'Name/Contact', required: true },
		{ key: 'address', label: 'Address', required: true },
		{ key: 'phone', label: 'Phone Number', required: false },
		{ key: 'notes', label: 'Notes', required: false }
	];

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

	const canProceed = $derived(nameColumn && addressColumn);

	function handleNext() {
		if (!canProceed) return;

		const mapping: Record<string, string> = {};
		if (nameColumn) mapping.name = nameColumn;
		if (addressColumn) mapping.address = addressColumn;
		if (phoneColumn) mapping.phone = phoneColumn;
		if (notesColumn) mapping.notes = notesColumn;

		onColumnsMapped(mapping);
	}

	function getFieldValue(field: string) {
		switch (field) {
			case 'name':
				return nameColumn;
			case 'address':
				return addressColumn;
			case 'phone':
				return phoneColumn;
			case 'notes':
				return notesColumn;
			default:
				return '';
		}
	}

	function setFieldValue(field: string, value: string) {
		switch (field) {
			case 'name':
				nameColumn = value;
				break;
			case 'address':
				addressColumn = value;
				break;
			case 'phone':
				phoneColumn = value;
				break;
			case 'notes':
				notesColumn = value;
				break;
		}
	}
</script>

<div class="space-y-6">
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Settings class="h-5 w-5" />
				Map CSV Columns
			</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<p class="text-sm text-muted-foreground">
				Map your CSV columns to the required stop fields. Name and Address are required.
			</p>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				{#each requiredFields as field}
					<div class="space-y-2">
						<Label class="flex items-center gap-2">
							{field.label}
							{#if field.required}
								<span class="text-xs text-destructive">*</span>
							{/if}
						</Label>
						<Select.Root
							type="single"
							value={getFieldValue(field.key)}
							onValueChange={(value) => setFieldValue(field.key, (value as string) || '')}
						>
							<Select.Trigger>
								<span class="text-muted-foreground">
									{getFieldValue(field.key) || 'Select column...'}
								</span>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="">-- None --</Select.Item>
								{#each csvHeaders as header}
									<Select.Item value={header}>{header}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				{/each}
			</div>

			{#if !canProceed}
				<div class="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
					Please map the required fields (Name and Address) to continue.
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Preview Table -->
	<CsvPreviewTable
		{csvData}
		{csvHeaders}
		mapping={{ name: nameColumn, address: addressColumn, phone: phoneColumn, notes: notesColumn }}
		maxRows={5}
	/>

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
