<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { FileUpload } from '$lib/components/ui/file-upload';
	import type { ImportState } from '$lib/schemas/import';
	import { parseCsvFile } from '$lib/utils';
	import { Upload } from 'lucide-svelte';

	let { importState = $bindable() }: { importState: ImportState } = $props();

	let parseError = $state<string | null>(null);

	async function handleFileSelect(files: File[]) {
		if (files.length === 0) return;

		parseError = null;
		const result = await parseCsvFile(files[0]);

		if (!result.success) {
			parseError = result.error.message;
			return;
		}

		importState.file = { name: result.data.fileName, headers: result.data.headers };
		importState.rawRows = result.data.rows;
		importState.step = 2;
	}

	function handleError(error: string) {
		parseError = error;
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
		<FileUpload
			accept=".csv"
			onFileSelect={handleFileSelect}
			onError={handleError}
			hint="CSV files only"
		/>

		{#if parseError}
			<div
				class="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
			>
				{parseError}
			</div>
		{/if}

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
