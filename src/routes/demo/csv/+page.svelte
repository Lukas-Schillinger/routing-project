<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import * as Table from '$lib/components/ui/table';
	import { CircleAlert, Download, Loader2, MapPin, Upload, User } from 'lucide-svelte';

	let uploading = $state(false);
	let geocoding = $state(false);
	let fileInput: HTMLInputElement;

	let uploadResult = $state<{
		success: boolean;
		error?: string;
		mapId?: string;
		uploadId?: string;
		recordCount?: number;
		records?: Array<{
			name: string;
			address: string;
			phone: string | null;
			notes: string | null;
		}>;
		fileName?: string;
	} | null>(null);

	let geocodeResult = $state<{
		success: boolean;
		error?: string;
		geocoded?: number;
		failed?: number;
		results?: Array<{
			record: {
				name: string;
				address: string;
				phone: string | null;
				notes: string | null;
			};
			location: any;
			stop: any;
		}>;
		errors?: Array<{
			record: any;
			error: string;
		}>;
	} | null>(null);

	async function handleUpload(event: Event) {
		event.preventDefault();
		uploading = true;
		uploadResult = null;
		geocodeResult = null;

		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);

		try {
			// Step 1: Upload CSV
			const response = await fetch('/api/maps/upload', {
				method: 'POST',
				body: formData
			});

			const data = await response.json();

			if (!response.ok) {
				uploadResult = {
					success: false,
					error: data.error || 'Upload failed'
				};
				return;
			}

			uploadResult = {
				success: true,
				mapId: data.mapId,
				uploadId: data.uploadId,
				recordCount: data.recordCount,
				records: data.records,
				fileName: fileInput.files?.[0]?.name || 'uploaded-file.csv'
			};

			// Step 2: Automatically geocode the addresses
			await geocodeAddresses(data.mapId, data.records);
		} catch (error) {
			uploadResult = {
				success: false,
				error: error instanceof Error ? error.message : 'Network error'
			};
		} finally {
			uploading = false;
		}
	}

	async function geocodeAddresses(mapId: string, records: any[]) {
		geocoding = true;
		geocodeResult = null;

		try {
			const response = await fetch(`/api/maps/${mapId}/geocode`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ records })
			});

			const data = await response.json();

			if (!response.ok) {
				geocodeResult = {
					success: false,
					error: data.error || 'Geocoding failed'
				};
				return;
			}

			geocodeResult = {
				success: true,
				geocoded: data.geocoded,
				failed: data.failed,
				results: data.results,
				errors: data.errors
			};
		} catch (error) {
			geocodeResult = {
				success: false,
				error: error instanceof Error ? error.message : 'Network error'
			};
		} finally {
			geocoding = false;
		}
	}

	// Sample data for download
	const sampleData = [
		{
			name: 'Laura Perez',
			address: '215 N Kentucky Ave, Lakeland, FL 33801',
			'phone number': '(863) 555-0193',
			notes: ''
		},
		{
			name: 'Marcus Allen',
			address: '930 E Lemon St, Lakeland, FL 33801',
			'phone number': '863-555-4472',
			notes: ''
		},
		{
			name: 'Stephanie Wong',
			address: '420 Bartow Rd, Lakeland, FL 33803',
			'phone number': '(863) 555-8230',
			notes: ''
		},
		{
			name: 'David Simmons',
			address: '100 Lake Morton Dr, Lakeland, FL 33801',
			'phone number': '(863) 555-3002',
			notes: ''
		},
		{
			name: 'Rachel Green',
			address: '3700 Cleveland Heights Blvd, Lakeland, FL 33803',
			'phone number': '863-555-7625',
			notes: ''
		},
		{
			name: 'Chris Martinez',
			address: '640 E Main St, Lakeland, FL 33801',
			'phone number': '(863) 555-2259',
			notes: ''
		},
		{
			name: 'Sandra Patel',
			address: '1500 S Florida Ave, Lakeland, FL 33803',
			'phone number': '863-555-0086',
			notes: ''
		},
		{
			name: 'Anthony Roberts',
			address: '1000 E Edgewood Dr, Lakeland, FL 33803',
			'phone number': '(863) 555-3910',
			notes: ''
		},
		{
			name: 'Emma Johnson',
			address: '920 E Memorial Blvd, Lakeland, FL 33801',
			'phone number': '863-555-5721',
			notes: ''
		},
		{
			name: 'Tyler Brooks',
			address: '701 W Lime St, Lakeland, FL 33815',
			'phone number': '(863) 555-6345',
			notes: ''
		}
	];
	function downloadSample() {
		const headers = ['name', 'address', 'phone number', 'notes'];
		const csvContent = [
			headers.join(','),
			...sampleData.map((row) =>
				[`"${row.name}"`, `"${row.address}"`, `"${row['phone number']}"`, `"${row.notes}"`].join(
					','
				)
			)
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'sample-contacts.csv';
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head>
	<title>New Map - Routing Project</title>
</svelte:head>

<div class="bg-gradient-to-br from-background via-muted to-secondary p-6">
	<div class="container mx-auto max-w-4xl">
		<div class="mb-8 text-center">
			<h1 class="headline-large mb-4">Create New Map</h1>
			<p class="body-large text-muted-foreground">
				Upload a CSV file with your stops and we'll automatically geocode all addresses
			</p>
		</div>

		<!-- Upload Section -->
		<Card class="mb-8 shadow-lg">
			<CardHeader>
				<CardTitle class="headline-card flex items-center">
					<Upload class="mr-2 h-5 w-5 text-primary" />
					Upload CSV File
				</CardTitle>
				<CardDescription class="body-medium">
					Upload a CSV file with columns: name, address, phone number, notes
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onsubmit={handleUpload} enctype="multipart/form-data" class="space-y-6">
					<div class="space-y-2">
						<Label for="csvFile" class="body-medium">CSV File</Label>
						<input
							bind:this={fileInput}
							id="csvFile"
							name="csvFile"
							type="file"
							accept=".csv,text/csv"
							required
							class="file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground file:hover:bg-primary/90"
						/>
						<p class="body-small text-muted-foreground">Accepted formats: .csv (max 5MB)</p>
					</div>

					<div class="flex flex-col gap-4 sm:flex-row">
						<Button type="submit" disabled={uploading || geocoding} class="flex-1">
							{#if uploading}
								<Upload class="mr-2 h-4 w-4 animate-spin" />
								Uploading CSV...
							{:else if geocoding}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Geocoding Addresses...
							{:else}
								<Upload class="mr-2 h-4 w-4" />
								Upload & Geocode CSV
							{/if}
						</Button>

						<Button type="button" variant="outline" onclick={downloadSample}>
							<Download class="mr-2 h-4 w-4" />
							Download Sample
						</Button>
					</div>

					{#if uploadResult?.error}
						<Alert.Root variant="destructive">
							<CircleAlert class="h-4 w-4" />
							<Alert.Title>Upload Error</Alert.Title>
							<Alert.Description>{uploadResult.error}</Alert.Description>
						</Alert.Root>
					{/if}

					{#if geocodeResult?.error}
						<Alert.Root variant="destructive">
							<CircleAlert class="h-4 w-4" />
							<Alert.Title>Geocoding Error</Alert.Title>
							<Alert.Description>{geocodeResult.error}</Alert.Description>
						</Alert.Root>
					{/if}

					{#if geocoding}
						<Alert.Root>
							<Loader2 class="h-4 w-4 animate-spin" />
							<Alert.Title>Geocoding in Progress</Alert.Title>
							<Alert.Description>
								Please wait while we geocode the addresses using Mapbox...
							</Alert.Description>
						</Alert.Root>
					{/if}
				</form>
			</CardContent>
		</Card>

		<!-- Geocoding Results Section -->
		{#if geocodeResult?.success && geocodeResult?.results}
			<Card class="mb-8 shadow-lg">
				<CardHeader>
					<CardTitle class="headline-card flex items-center">
						<MapPin class="mr-2 h-5 w-5 text-primary" />
						Geocoding Results
					</CardTitle>
					<CardDescription class="body-medium">
						Successfully geocoded {geocodeResult.geocoded} of {uploadResult?.recordCount} addresses
						{#if geocodeResult.failed && geocodeResult.failed > 0}
							<span class="text-destructive">({geocodeResult.failed} failed)</span>
						{/if}
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-6">
					<!-- Summary -->
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div class="flex flex-wrap gap-2">
							<Badge variant="secondary">
								<MapPin class="mr-1 h-3 w-3" />
								{geocodeResult.geocoded} Geocoded
							</Badge>
							{#if geocodeResult.failed && geocodeResult.failed > 0}
								<Badge variant="destructive">
									<CircleAlert class="mr-1 h-3 w-3" />
									{geocodeResult.failed} Failed
								</Badge>
							{/if}
						</div>
						{#if uploadResult?.mapId}
							<Button href="/maps/{uploadResult.mapId}">
								<MapPin class="mr-2 h-4 w-4" />
								View Map Details
							</Button>
						{/if}
					</div>

					<!-- Geocoded Locations Table -->
					<div class="space-y-4">
						<h3 class="headline-small">Geocoded Locations</h3>
						<div class="rounded-md border">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head class="w-12">#</Table.Head>
										<Table.Head>Name</Table.Head>
										<Table.Head>Address</Table.Head>
										<Table.Head>Coordinates</Table.Head>
										<Table.Head>Confidence</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each geocodeResult.results as result, index}
										<Table.Row>
											<Table.Cell class="font-medium">{index + 1}</Table.Cell>
											<Table.Cell>
												<div class="flex items-center">
													<User class="mr-2 h-4 w-4 flex-shrink-0 text-primary" />
													<span class="font-semibold">{result.record.name}</span>
												</div>
											</Table.Cell>
											<Table.Cell>
												<div class="flex items-start">
													<MapPin class="mt-0.5 mr-2 h-4 w-4 flex-shrink-0 text-primary" />
													<div class="text-sm">
														<div class="font-medium">{result.location.address_line1}</div>
														<div class="text-muted-foreground">
															{result.location.city}, {result.location.region}
															{result.location.postal_code}
														</div>
													</div>
												</div>
											</Table.Cell>
											<Table.Cell class="font-mono text-sm">
												{parseFloat(result.location.lat).toFixed(6)}, {parseFloat(
													result.location.lon
												).toFixed(6)}
											</Table.Cell>
											<Table.Cell>
												<Badge variant="outline">
													{parseFloat(result.location.geocode_confidence).toFixed(1)}%
												</Badge>
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					</div>

					<!-- Failed Geocoding Errors -->
					{#if geocodeResult.errors && geocodeResult.errors.length > 0}
						<div class="space-y-4">
							<h3 class="headline-small text-destructive">Failed Addresses</h3>
							<div class="space-y-2">
								{#each geocodeResult.errors as error}
									<Alert.Root variant="destructive">
										<CircleAlert class="h-4 w-4" />
										<Alert.Title>{error.record.name}</Alert.Title>
										<Alert.Description>
											Address: {error.record.address}<br />
											Error: {error.error}
										</Alert.Description>
									</Alert.Root>
								{/each}
							</div>
						</div>
					{/if}

					<!-- JSON Output -->
					<details class="space-y-2">
						<summary class="headline-small cursor-pointer">Geocoded Data JSON</summary>
						<pre class="body-small overflow-x-auto rounded bg-muted p-4 text-muted-foreground"><code
								>{JSON.stringify(geocodeResult.results, null, 2)}</code
							></pre>
					</details>
				</CardContent>
			</Card>
		{/if}
	</div>
</div>
