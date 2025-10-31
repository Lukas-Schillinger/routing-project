<script lang="ts">
	import { goto } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import CardFooter from '$lib/components/ui/card/card-footer.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { mapApi } from '$lib/services/api/maps';
	import type { GeocodeCSVResult } from '$lib/services/server/csv-import.service';
	import { AlertCircle, CheckCircle, FileText, MapPin, Upload } from 'lucide-svelte';

	let fileInput: HTMLInputElement;
	let selectedFile: File | null = null;
	let isLoading = false;
	let results: GeocodeCSVResult[] = [];
	let error: string | null = null;

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file) {
			if (!file.name.endsWith('.csv')) {
				error = 'Please select a CSV file';
				selectedFile = null;
				return;
			}
			selectedFile = file;
			error = null;
		}
	}

	async function handleUpload() {
		if (!selectedFile) return;

		isLoading = true;
		error = null;
		results = [];

		try {
			results = await mapApi.geocodeCSV(selectedFile);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to geocode CSV';
		} finally {
			isLoading = false;
		}
	}

	async function createMap() {
		console.log('Hello');
		const mapName = `CSV Import ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
		const res = await mapApi.createFromCSV(mapName, results);
		goto(`/maps/${res.map.id}`);
	}

	function reset() {
		selectedFile = null;
		results = [];
		error = null;
		if (fileInput) {
			fileInput.value = '';
		}
	}

	function getSuccessCount() {
		return results.filter((r) => r.feature !== null).length;
	}

	function getFailedCount() {
		return results.filter((r) => r.feature === null).length;
	}
</script>

<div class="container mx-auto max-w-6xl p-6">
	<div class="mb-8">
		<h1 class="text-3xl font-bold">CSV Geocoding Demo</h1>
		<p class="mt-2 text-muted-foreground">
			Upload a CSV file with addresses to see geocoding results. Your CSV should have columns: name,
			address, phone (optional), notes (optional).
		</p>
	</div>
	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Upload Section -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Upload class="h-5 w-5" />
					Upload CSV File
				</CardTitle>
				<CardDescription>Select a CSV file containing addresses to geocode</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-2">
					<Label for="csv-file">CSV File</Label>
					<Input
						id="csv-file"
						type="file"
						accept=".csv"
						bind:value={fileInput}
						onchange={handleFileSelect}
						disabled={isLoading}
					/>
				</div>

				{#if selectedFile}
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<FileText class="h-4 w-4" />
						<span>{selectedFile.name}</span>
						<span>({(selectedFile.size / 1024).toFixed(1)} KB)</span>
					</div>
				{/if}

				{#if error}
					<div class="flex items-center gap-2 text-sm text-destructive">
						<AlertCircle class="h-4 w-4" />
						{error}
					</div>
				{/if}

				<div class="flex gap-2">
					<Button onclick={handleUpload} disabled={!selectedFile || isLoading} class="flex-1">
						{#if isLoading}
							<div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
							Geocoding...
						{:else}
							<MapPin class="mr-2 h-4 w-4" />
							Geocode CSV
						{/if}
					</Button>

					{#if results.length > 0 || error}
						<Button variant="outline" onclick={reset}>Reset</Button>
					{/if}
				</div>
			</CardContent>
		</Card>

		<!-- Results Summary -->
		{#if results.length > 0}
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<CheckCircle class="h-5 w-5" />
						Geocoding Results
					</CardTitle>
					<CardDescription>
						Summary of geocoding results for {results.length} records
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div class="rounded-lg bg-green-50 p-4 text-center dark:bg-green-950">
							<div class="text-2xl font-bold text-green-600 dark:text-green-400">
								{getSuccessCount()}
							</div>
							<div class="text-sm text-green-600 dark:text-green-400">Successful</div>
						</div>
						<div class="rounded-lg bg-red-50 p-4 text-center dark:bg-red-950">
							<div class="text-2xl font-bold text-red-600 dark:text-red-400">
								{getFailedCount()}
							</div>
							<div class="text-sm text-red-600 dark:text-red-400">Failed</div>
						</div>
					</div>

					<div class="text-sm text-muted-foreground">
						Success rate: {((getSuccessCount() / results.length) * 100).toFixed(1)}%
					</div>
				</CardContent>
				<CardFooter>
					<Button class="w-full" onclick={createMap}>Create Map</Button>
				</CardFooter>
			</Card>
		{/if}
	</div>

	<!-- Detailed Results -->
	{#if results.length > 0}
		<Card class="mt-6">
			<CardHeader>
				<CardTitle>Detailed Results</CardTitle>
				<CardDescription>View geocoding results for each address</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="max-h-96 space-y-3 overflow-y-auto">
					{#each results as result, index}
						<div class="space-y-2 rounded-lg border p-4">
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="font-medium">{result.name}</div>
									<div class="text-sm text-muted-foreground">{result.raw_address}</div>
									{#if result.phone}
										<div class="text-sm text-muted-foreground">{result.phone}</div>
									{/if}
									{#if result.notes}
										<div class="text-sm text-muted-foreground">{result.notes}</div>
									{/if}
								</div>
								<div class="ml-4">
									{#if result.feature}
										<Badge
											class="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
										>
											<MapPin class="mr-1 h-3 w-3" />
											Geocoded
										</Badge>
									{:else}
										<Badge variant="destructive">
											<AlertCircle class="mr-1 h-3 w-3" />
											Failed
										</Badge>
									{/if}
								</div>
							</div>

							{#if result.feature}
								<div class="space-y-1 text-xs text-muted-foreground">
									<div>
										<strong>Coordinates:</strong>
										{result.feature.geometry.coordinates[1].toFixed(6)}, {result.feature.geometry.coordinates[0].toFixed(
											6
										)}
									</div>
									<div>
										<strong>Formatted:</strong>
										{result.feature.properties.place_formatted ||
											result.feature.properties.full_address ||
											'N/A'}
									</div>
									<div>
										<strong>Confidence:</strong>
										{result.feature.properties.feature_type}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}
</div>
