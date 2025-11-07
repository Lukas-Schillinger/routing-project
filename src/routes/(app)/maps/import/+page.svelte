<!-- src/routes/(app)/maps/[mapId]/import/+page.svelte -->
<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import { FileText, Settings, Upload } from 'lucide-svelte';
	import { getContext } from 'svelte';
	import type { PageData } from './$types';

	import ColumnMappingStep from './ColumnMappingStep.svelte';
	import FileUploadStep from './FileUploadStep.svelte';

	let { data }: { data: PageData } = $props();

	// Wizard state
	let currentStep = $state(1);
	let csvData = $state<any[]>([]);
	let csvHeaders = $state<string[]>([]);
	let columnMapping = $state<Record<string, string>>({});
	let selectedFile = $state<File | null>(null);

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

	function handleColumnsMapped(mapping: Record<string, string>) {
		columnMapping = mapping;
		currentStep = 3;
	}
</script>

<div class="space-y-6">
	<!-- Progress Steps -->
	<Card>
		<CardHeader>
			<CardTitle>Import CSV Stops</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="flex items-center justify-between">
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
						{#if index < steps.length - 1}
							<div class="mx-4 h-px w-16 bg-border"></div>
						{/if}
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
		<!-- Step 3 will be geocoding review -->
		<div>Review step coming next...</div>
	{/if}
</div>
