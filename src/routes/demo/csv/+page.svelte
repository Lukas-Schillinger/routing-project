<script lang="ts">
	import { enhance } from '$app/forms';
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
	import {
		CircleAlert,
		CircleCheck,
		Download,
		FileEdit,
		FileText,
		MapPin,
		Phone,
		Upload,
		User
	} from 'lucide-svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let uploading = $state(false);
	let fileInput: HTMLInputElement;

	// Sample data for download
	const sampleData = [
		{
			name: 'John Doe',
			address: '123 Main St, Austin, TX 78701',
			'phone number': '(555) 123-4567',
			notes: 'Prefers morning appointments'
		},
		{
			name: 'Jane Smith',
			address: '456 Oak Ave, Houston, TX 77002',
			'phone number': '555-987-6543',
			notes: 'VIP customer'
		},
		{
			name: 'Bob Johnson',
			address: '789 Pine Rd, Dallas, TX 75201',
			'phone number': '(555) 456-7890',
			notes: 'Needs wheelchair access'
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

	function downloadResults() {
		if (!form?.data) return;

		const headers = ['name', 'address', 'phoneNumber', 'notes'];
		const csvContent = [
			headers.join(','),
			...form.data.map((row: any) =>
				[`"${row.name}"`, `"${row.address}"`, `"${row.phoneNumber}"`, `"${row.notes}"`].join(',')
			)
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'processed-contacts.csv';
		a.click();
		URL.revokeObjectURL(url);
	}

	function copyJsonToClipboard() {
		if (!form?.data) return;
		navigator.clipboard.writeText(JSON.stringify(form.data, null, 2));
	}
</script>

<svelte:head>
	<title>CSV Upload Demo - Routing Project</title>
</svelte:head>

<div class="bg-gradient-to-br from-background via-muted to-secondary p-6">
	<div class="container mx-auto max-w-4xl">
		<div class="mb-8 text-center">
			<h1 class="headline-large mb-4">CSV Upload & Parser</h1>
			<p class="body-large text-muted-foreground">
				Upload a CSV file with contact information and get a parsed JSON array
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
				<form
					method="POST"
					action="?/upload"
					use:enhance={() => {
						uploading = true;
						return async ({ update }) => {
							uploading = false;
							await update();
						};
					}}
					enctype="multipart/form-data"
					class="space-y-6"
				>
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
						<Button type="submit" disabled={uploading} class="flex-1">
							{#if uploading}
								<FileText class="mr-2 h-4 w-4 animate-spin" />
								Processing...
							{:else}
								<Upload class="mr-2 h-4 w-4" />
								Upload & Parse CSV
							{/if}
						</Button>

						<Button type="button" variant="outline" onclick={downloadSample}>
							<Download class="mr-2 h-4 w-4" />
							Download Sample
						</Button>
					</div>

					{#if form?.error}
						<Alert.Root variant="destructive">
							<CircleAlert class="h-4 w-4" />
							<Alert.Title>Error</Alert.Title>
							<Alert.Description>{form.error}</Alert.Description>
						</Alert.Root>
					{/if}
				</form>
			</CardContent>
		</Card>

		<!-- Results Section -->
		{#if form?.success && form?.data}
			<Card class="mb-8 shadow-lg">
				<CardHeader>
					<CardTitle class="headline-card flex items-center">
						<CircleCheck class="mr-2 h-5 w-5 text-primary" />
						Parsing Results
					</CardTitle>
					<CardDescription class="body-medium">
						Successfully processed {form.count} records from "{form.fileName}"
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-6">
					<!-- Summary -->
					<div class="flex flex-wrap gap-2">
						<Badge variant="secondary">
							<FileText class="mr-1 h-3 w-3" />
							{form.count} Records
						</Badge>
						<Badge variant="secondary">
							<CircleCheck class="mr-1 h-3 w-3" />
							Validated
						</Badge>
					</div>

					<!-- Action Buttons -->
					<div class="flex flex-col gap-2 sm:flex-row">
						<Button onclick={copyJsonToClipboard} variant="outline">
							<FileEdit class="mr-2 h-4 w-4" />
							Copy JSON to Clipboard
						</Button>
						<Button onclick={downloadResults} variant="outline">
							<Download class="mr-2 h-4 w-4" />
							Download Processed CSV
						</Button>
					</div>

					<!-- Data Preview -->
					<div class="space-y-4">
						<h3 class="headline-small">Data Preview</h3>
						<div class="max-h-96 space-y-4 overflow-y-auto">
							{#each form.data.slice(0, 5) as record, index}
								<Card class="border-l-4 border-l-primary">
									<CardContent class="pt-4">
										<div class="grid gap-3">
											<div class="flex items-center">
												<User class="mr-2 h-4 w-4 text-primary" />
												<span class="body-medium font-semibold">{record.name}</span>
											</div>
											{#if record.address}
												<div class="flex items-start">
													<MapPin class="mt-0.5 mr-2 h-4 w-4 text-primary" />
													<span class="body-small text-muted-foreground">{record.address}</span>
												</div>
											{/if}
											{#if record.phoneNumber}
												<div class="flex items-center">
													<Phone class="mr-2 h-4 w-4 text-primary" />
													<span class="body-small text-muted-foreground">{record.phoneNumber}</span>
												</div>
											{/if}
											{#if record.notes}
												<div class="flex items-start">
													<FileEdit class="mt-0.5 mr-2 h-4 w-4 text-primary" />
													<span class="body-small text-muted-foreground">{record.notes}</span>
												</div>
											{/if}
										</div>
									</CardContent>
								</Card>
							{/each}

							{#if form.data.length > 5}
								<p class="body-small text-center text-muted-foreground">
									... and {form.data.length - 5} more records
								</p>
							{/if}
						</div>
					</div>

					<!-- JSON Output -->
					<details class="space-y-2">
						<summary class="headline-small cursor-pointer">JSON Output</summary>
						<pre class="body-small overflow-x-auto rounded bg-muted p-4 text-muted-foreground"><code
								>{JSON.stringify(form.data, null, 2)}</code
							></pre>
					</details>
				</CardContent>
			</Card>
		{/if}

		<!-- Instructions -->
		<Card class="shadow-lg">
			<CardHeader>
				<CardTitle class="headline-small">Instructions</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					<div>
						<h4 class="body-medium mb-2 font-semibold">Required CSV Format:</h4>
						<ul class="body-small space-y-1 text-muted-foreground">
							<li>
								• Column headers: <code class="rounded bg-muted px-1"
									>name, address, phone number, notes</code
								>
							</li>
							<li>• Headers are case-insensitive and whitespace is trimmed</li>
							<li>• Name field is required, others are optional</li>
							<li>• Phone numbers are validated for basic format</li>
						</ul>
					</div>

					<div>
						<h4 class="body-medium mb-2 font-semibold">Features:</h4>
						<ul class="body-small space-y-1 text-muted-foreground">
							<li>• Validates CSV structure and required columns</li>
							<li>• Cleans and normalizes data</li>
							<li>• Returns validated JSON array</li>
							<li>• Provides detailed error messages</li>
							<li>• Maximum file size: 5MB</li>
						</ul>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>
</div>
