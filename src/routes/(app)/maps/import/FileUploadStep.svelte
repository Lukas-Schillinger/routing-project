<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import type { ImportState } from '$lib/schemas/import';
	import { AlertCircle, FileText, Upload } from 'lucide-svelte';
	import Papa from 'papaparse';

	let { importState = $bindable() }: { importState: ImportState } = $props();

	let isDragOver = $state(false);
	let isProcessing = $state(false);
	let error = $state<string | null>(null);
	let fileInput: HTMLInputElement;

	function handleFileSelect(files: FileList | null) {
		if (!files || files.length === 0) return;

		const file = files[0];
		if (!file.name.endsWith('.csv')) {
			error = 'Please select a CSV file';
			return;
		}

		processFile(file);
	}

	function processFile(file: File) {
		isProcessing = true;
		error = null;

		Papa.parse(file, {
			header: true,
			skipEmptyLines: true,
			complete: (results) => {
				if (results.errors.length > 0) {
					error = `CSV parsing error: ${results.errors[0].message}`;
					isProcessing = false;
					return;
				}

				const headers = results.meta.fields || [];
				const rows = results.data as Record<string, string>[];

				if (headers.length === 0) {
					error = 'No columns found in CSV file';
					isProcessing = false;
					return;
				}

				if (rows.length === 0) {
					error = 'No data rows found in CSV file';
					isProcessing = false;
					return;
				}

				// Update importState directly
				importState.file = { name: file.name, headers };
				importState.rawRows = rows;
				importState.step = 2;

				isProcessing = false;
			},
			error: (err) => {
				error = `Failed to read file: ${err.message}`;
				isProcessing = false;
			}
		});
	}
</script>

<Card>
	<CardHeader>
		<CardTitle class="flex items-center gap-2">
			<Upload class="h-5 w-5" />
			Upload CSV File
		</CardTitle>
	</CardHeader>
	<CardContent class="space-y-4">
		{#if error}
			<div
				class="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
			>
				<div class="flex items-center gap-2">
					<AlertCircle class="h-4 w-4" />
					{error}
				</div>
			</div>
		{/if}

		<!-- File Drop Zone -->
		<div
			class="rounded-lg border-2 border-dashed p-8 text-center transition-colors
                {isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                {isProcessing ? 'pointer-events-none opacity-50' : 'cursor-pointer'}"
			role="button"
			tabindex="0"
			ondragover={(e) => {
				e.preventDefault();
				isDragOver = true;
			}}
			ondragleave={() => (isDragOver = false)}
			ondrop={(e) => {
				e.preventDefault();
				isDragOver = false;
				handleFileSelect(e.dataTransfer?.files || null);
			}}
			onclick={() => fileInput?.click()}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					fileInput?.click();
				}
			}}
		>
			<div class="flex flex-col items-center gap-3">
				<FileText class="h-12 w-12 text-muted-foreground" />
				<div>
					<p class="text-lg font-medium">
						{isProcessing ? 'Processing file...' : 'Drop your CSV file here'}
					</p>
					<p class="text-sm text-muted-foreground">or click to browse your files</p>
				</div>
			</div>
		</div>

		<input
			bind:this={fileInput}
			type="file"
			accept=".csv"
			class="hidden"
			onchange={(e) => handleFileSelect(e.currentTarget.files)}
		/>

		<!-- Requirements -->
		<div class="rounded-md bg-muted/50 p-4 text-sm">
			<h4 class="mb-2 font-medium">CSV Requirements:</h4>
			<ul class="list-inside list-disc space-y-1 text-muted-foreground">
				<li>File must have headers in the first row</li>
				<li>Must include at least an address column</li>
				<li>Optional: name, phone, notes columns</li>
			</ul>
		</div>
	</CardContent>
</Card>
