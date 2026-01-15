<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { createImportState, type ImportState } from '$lib/schemas/import';
	import { mapApi, stopApi } from '$lib/services/api';
	import { pendingImport } from '$lib/stores/pending-import';
	import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	import ColumnMappingStep from './ColumnMappingStep.svelte';
	import FileUploadStep from './FileUploadStep.svelte';
	import GeocodeReviewStep from './GeocodeReviewStep.svelte';

	let { data }: { data: PageData } = $props();

	let importState = $state<ImportState>(createImportState());
	let isCreating = $state(false);

	// When importing to existing map, skip file upload step (it comes from pending import)
	const isImportingToExistingMap = $derived(!!data.existingMap);

	// Check for pending import data from map detail page
	onMount(() => {
		const pending = pendingImport.consume();
		if (pending) {
			importState.file = { name: pending.fileName, headers: pending.headers };
			importState.rawRows = pending.rows;
			importState.step = 2;
		}
	});

	// Child component refs
	let columnMappingStep: ColumnMappingStep | undefined = $state();
	let geocodeReviewStep: GeocodeReviewStep | undefined = $state();

	// Child component state
	let step2CanProceed = $state(false);
	let step3ValidCount = $state(0);
	let step3IsImporting = $state(false);

	const steps = [
		{ number: 1 as const, title: 'Upload' },
		{ number: 2 as const, title: 'Map Columns' },
		{ number: 3 as const, title: 'Review' }
	];

	async function createEmptyMap() {
		try {
			isCreating = true;
			const { map } = await mapApi.create({
				title: `Map ${new Date().toLocaleDateString()}`
			});
			await goto(resolve(`/maps/${map.id}`));
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

		if (data.existingMap) {
			// Add stops to existing map
			await stopApi.bulkCreate(data.existingMap.id, stops);
			goto(resolve(`/maps/${data.existingMap.id}`));
		} else {
			// Create new map with stops
			const title =
				importState.file?.name.replace('.csv', '') ??
				`Map ${new Date().toLocaleDateString()}`;
			const res = await mapApi.create({
				title,
				stops
			});
			goto(resolve(`/maps/${res.map.id}`));
		}
	}

	function handleBack() {
		if (importState.step === 2) {
			importState.step = 1;
		} else if (importState.step === 3) {
			importState.step = 2;
		}
	}

	function handleNext() {
		if (importState.step === 2) {
			columnMappingStep?.handleNext();
		} else if (importState.step === 3) {
			geocodeReviewStep?.handleImport();
		}
	}

	function goToStep(stepNumber: 1 | 2 | 3) {
		// Only allow navigating to completed steps
		if (stepNumber < importState.step) {
			importState.step = stepNumber;
		}
	}

	// Derived states for button visibility and disabled states
	const showBackButton = $derived(importState.step > 1);
	const showNextButton = $derived(
		importState.step === 2 || importState.step === 3
	);

	const nextButtonDisabled = $derived(() => {
		if (importState.step === 2) {
			return !step2CanProceed || importState.isProcessing;
		}
		if (importState.step === 3) {
			return (
				step3ValidCount === 0 || step3IsImporting || importState.isProcessing
			);
		}
		return true;
	});

	const nextButtonLabel = $derived(() => {
		if (importState.step === 2) {
			if (importState.isProcessing) return 'Geocoding...';
			return 'Next';
		}
		if (importState.step === 3) {
			if (step3IsImporting) return 'Importing...';
			return `Import ${step3ValidCount}`;
		}
		return 'Next';
	});

	const isProcessing = $derived(importState.isProcessing || step3IsImporting);
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold tracking-tight">
			Importing stops for
			{#if isImportingToExistingMap}
				{data.existingMap?.title}
			{:else}
				New Map
			{/if}
		</h1>
	</div>

	<!-- Step Header with Progress -->
	<div class="rounded-lg border border-border bg-card p-4">
		<div class="flex items-center justify-between">
			<!-- Back Button -->
			<div class="w-20">
				{#if showBackButton}
					<Button
						variant="ghost"
						size="sm"
						onclick={handleBack}
						disabled={isProcessing}
						class="gap-1.5"
					>
						<ArrowLeft class="h-4 w-4" />
						Back
					</Button>
				{/if}
			</div>

			<!-- Step Indicators -->
			<div class="flex items-center">
				{#each steps as step, index (step.number)}
					{@const isCompleted = importState.step > step.number}
					{@const isCurrent = importState.step === step.number}
					{@const isClickable = isCompleted}

					<!-- Connector Line -->
					{#if index > 0}
						<div
							class="mb-5 h-0.5 w-12 transition-colors duration-300
								{importState.step > step.number ? 'bg-primary' : ''}
								{importState.step === step.number ? 'bg-primary/50' : ''}
								{importState.step < step.number ? 'bg-muted' : ''}"
						></div>
					{/if}

					<!-- Step Circle + Label -->
					<button
						type="button"
						class="group flex flex-col items-center gap-1.5 transition-all
							{isClickable ? 'cursor-pointer' : 'cursor-default'}"
						onclick={() => isClickable && goToStep(step.number)}
						disabled={!isClickable}
					>
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-all duration-300
								{isCompleted ? 'border-primary bg-primary/10 text-primary' : ''}
								{isCurrent ? 'border-primary bg-primary text-primary-foreground' : ''}
								{!isCompleted && !isCurrent
								? 'border-muted bg-muted/50 text-muted-foreground'
								: ''}
								{isClickable ? 'group-hover:scale-105' : ''}"
						>
							{#if isCompleted}
								<Check class="h-4 w-4" />
							{:else}
								{step.number}
							{/if}
						</div>
						<span
							class="text-xs font-medium transition-colors
								{isCurrent ? 'text-foreground' : ''}
								{isCompleted ? 'text-muted-foreground group-hover:text-foreground' : ''}
								{!isCompleted && !isCurrent ? 'text-muted-foreground/50' : ''}"
						>
							{step.title}
						</span>
					</button>
				{/each}
			</div>

			<!-- Next/Import Button -->
			<div class="flex w-20 justify-end">
				{#if showNextButton}
					<Button
						size="sm"
						onclick={handleNext}
						disabled={nextButtonDisabled()}
						class="gap-1.5"
					>
						{#if isProcessing}
							<Loader2 class="h-4 w-4 animate-spin" />
						{/if}
						{nextButtonLabel()}
						{#if !isProcessing}
							<ArrowRight class="h-4 w-4" />
						{/if}
					</Button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Step Content -->
	{#if importState.step === 1}
		<div class="space-y-6">
			{#if !isImportingToExistingMap}
				<Button
					class="w-full"
					onclick={createEmptyMap}
					variant="outline"
					disabled={isCreating}
				>
					{isCreating ? 'Creating...' : 'Create empty map'}
				</Button>
			{/if}
			<FileUploadStep bind:importState />
		</div>
	{:else if importState.step === 2}
		<ColumnMappingStep
			bind:this={columnMappingStep}
			bind:importState
			onCanProceedChange={(canProceed) => (step2CanProceed = canProceed)}
		/>
	{:else if importState.step === 3}
		<GeocodeReviewStep
			bind:this={geocodeReviewStep}
			bind:importState
			onImport={handleImport}
			onValidCountChange={(count, importing) => {
				step3ValidCount = count;
				step3IsImporting = importing;
			}}
		/>
	{/if}
</div>
