<script lang="ts">
	import AddressAutocomplete from '$lib/components/AddressAutocomplete.svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as Popover from '$lib/components/ui/popover';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import type { LocationCreate } from '$lib/schemas/location';
	import { geocodingApi } from '$lib/services/api';
	import type { GeocodeCSVResult } from '$lib/services/server/csv-import.service';
	import {
		ArrowLeft,
		CircleAlert,
		CircleCheck,
		MapPin,
		NotepadText,
		Phone,
		SquarePen,
		TriangleAlert,
		Upload
	} from 'lucide-svelte';

	let {
		geocodedResults = $bindable([]),
		isGeocoding = false,
		onBack,
		onImport
	}: {
		geocodedResults?: GeocodeCSVResult[];
		isGeocoding?: boolean;
		onBack: () => void;
		onImport: (results: GeocodeCSVResult[]) => Promise<void>;
	} = $props();

	let isImporting = $state(false);
	let editingRowIndex = $state<number | null>(null);
	let editAddressValue = $state('');

	function getConfidence(result: GeocodeCSVResult): 'exact' | 'high' | 'medium' | 'low' | 'none' {
		if (!result.feature) return 'none';

		const matchCode = result.feature.properties.match_code;
		if (!matchCode) return 'medium';

		// Mapbox match codes indicate accuracy
		// https://docs.mapbox.com/api/search/geocoding/#geocoding-response-object
		if (matchCode.confidence === 'exact') return 'exact';
		if (matchCode.confidence === 'high') return 'high';
		if (matchCode.confidence === 'medium') return 'medium';
		return 'low';
	}

	function getStatusIcon(confidence: ReturnType<typeof getConfidence>) {
		switch (confidence) {
			case 'exact':
			case 'high':
				return CircleCheck;
			case 'medium':
				return TriangleAlert;
			case 'low':
				return TriangleAlert;
			case 'none':
				return CircleAlert;
		}
	}

	function getStatusColor(confidence: ReturnType<typeof getConfidence>) {
		switch (confidence) {
			case 'exact':
			case 'high':
				return 'text-green-600';
			case 'medium':
				return 'text-yellow-600';
			case 'low':
				return 'text-yellow-600';
			case 'none':
				return 'text-destructive';
		}
	}

	function startEditingAddress(index: number) {
		editingRowIndex = index;
		editAddressValue = geocodedResults[index].raw_address;
	}

	function cancelEditingAddress() {
		editingRowIndex = null;
		editAddressValue = '';
	}

	async function handleAddressSelected(index: number, location: LocationCreate) {
		// The full address is in address_line_1
		const addressToGeocode = location.address_line_1;

		// Geocode the new address to get the feature
		try {
			const features = await geocodingApi.forward(addressToGeocode, {
				country: 'US',
				limit: 1
			});

			if (features.length > 0) {
				const feature = features[0];
				// Update the result with new geocoded data
				geocodedResults[index] = {
					...geocodedResults[index],
					raw_address: addressToGeocode,
					feature
				};
			}
		} catch (error) {
			console.error('Failed to geocode new address:', error);
		} finally {
			cancelEditingAddress();
		}
	}

	async function handleImport() {
		const resultsToImport = geocodedResults.filter((r) => r.feature != null);
		isImporting = true;
		try {
			await onImport(resultsToImport);
		} finally {
			isImporting = false;
		}
	}

	const validRowCount = $derived(
		geocodedResults.filter((r) => r.feature != null && getConfidence(r) !== 'none').length
	);
	const lowConfidenceCount = $derived(
		geocodedResults.filter((r) => {
			const conf = getConfidence(r);
			return conf === 'low' || conf === 'medium';
		}).length
	);
	const errorCount = $derived(geocodedResults.filter((r) => !r.feature).length);

	// Sort results: failed and low confidence first, then medium, then high confidence
	const sortedResults = $derived(
		geocodedResults
			.map((result, index) => ({ result, originalIndex: index }))
			.sort((a, b) => {
				const confA = getConfidence(a.result);
				const confB = getConfidence(b.result);

				// Priority order: none > low > medium > high > exact
				const priority = { none: 0, low: 1, medium: 2, high: 3, exact: 3 };

				return priority[confA] - priority[confB];
			})
	);
</script>

<div class="space-y-6">
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<MapPin class="h-5 w-5" />
				Geocoding Results
			</CardTitle>
			<p class="text-sm text-muted-foreground">
				Review geocoded addresses. All valid addresses will be imported.
			</p>
		</CardHeader>
		<CardContent>
			{#if isGeocoding}
				<!-- Loading State -->
				<div class="space-y-4">
					<p class="text-sm text-muted-foreground">Geocoding addresses...</p>
					{#each Array(5) as _}
						<div class="flex items-start gap-3 rounded-lg border p-3">
							<Skeleton class="h-5 w-5 rounded" />
							<div class="flex-1 space-y-2">
								<Skeleton class="h-4 w-3/4" />
								<Skeleton class="h-3 w-1/2" />
							</div>
						</div>
					{/each}
				</div>
			{:else if geocodedResults.length === 0}
				<p class="text-sm text-muted-foreground">No results to display</p>
			{:else}
				<!-- Summary Stats -->
				<div class="mb-4 flex flex-wrap gap-4 rounded-lg bg-muted p-3 text-sm">
					<div class="flex items-center gap-2">
						<CircleCheck class="h-4 w-4 text-green-600" />
						<span>{validRowCount} valid</span>
					</div>
					{#if lowConfidenceCount > 0}
						<div class="flex items-center gap-2">
							<TriangleAlert class="h-4 w-4 text-yellow-600" />
							<span>{lowConfidenceCount} low confidence</span>
						</div>
					{/if}
					{#if errorCount > 0}
						<div class="flex items-center gap-2">
							<CircleAlert class="h-4 w-4 text-destructive" />
							<span>{errorCount} failed</span>
						</div>
					{/if}
				</div>

				<!-- Results List -->
				<div class="max-h-[600px] space-y-2 overflow-y-auto">
					{#each sortedResults as { result, originalIndex }}
						{@const confidence = getConfidence(result)}
						{@const StatusIcon = getStatusIcon(confidence)}
						{@const statusColor = getStatusColor(confidence)}
						{@const isInvalid = !result.feature}
						<div class="flex flex-col justify-between gap-3 rounded-lg border p-3 sm:flex-row">
							<div class="flex items-start gap-3 transition-colors">
								<!-- Status Icon -->
								<StatusIcon class="mt-0.5 h-5 w-5 flex-shrink-0 {statusColor}" />

								<!-- Content -->
								<div class="flex-1 space-y-1">
									<div class="flex items-start justify-between gap-2">
										<div class="flex-1">
											{#if result.name}
												<div class="font-medium">{result.name}</div>
											{/if}
										</div>
									</div>

									{#if result.feature}
										<div class="flex items-start gap-2 text-sm text-muted-foreground">
											<MapPin class="mt-0.5 h-3 w-3 flex-shrink-0" />
											<span class="flex-1">
												{result.feature.properties.context?.address?.name}
												{result.feature.properties.context?.place?.name},
												{result.feature.properties.context?.region?.region_code}
											</span>
										</div>
									{:else}
										<div class="flex items-center justify-between gap-2">
											<div class="text-sm text-destructive">
												<CircleAlert class="inline h-3 w-3" />
												Could not geocode this address
											</div>
										</div>
									{/if}

									<div class="flex flex-col gap-2 gap-x-3 sm:flex-row">
										{#if result.phone}
											<div
												class="flex items-center gap-1.5 text-sm whitespace-nowrap text-muted-foreground"
											>
												<Phone class="h-3 w-3 shrink-0" />
												{result.phone}
											</div>
										{/if}
										{#if result.notes}
											<div class="flex items-center gap-1.5 text-sm text-muted-foreground">
												<NotepadText class="h-3 w-3 shrink-0" />
												<span class="line-clamp-2">{result.notes}</span>
											</div>
										{/if}
									</div>
								</div>
							</div>
							{#if isInvalid}
								<Popover.Root
									open={editingRowIndex === originalIndex}
									onOpenChange={(open) => {
										if (!open) cancelEditingAddress();
									}}
								>
									<Popover.Trigger
										class="{buttonVariants({
											variant: 'outline',
											size: 'sm'
										})} mb-auto w-full sm:w-fit"
									>
										<SquarePen class="mr-2 h-3 w-3" />
										Fix Address
									</Popover.Trigger>
									<Popover.Content class="w-80">
										<div class="space-y-3">
											<div>
												<h4 class="leading-none font-medium">Edit Address</h4>
												<p class="mt-1 text-sm text-muted-foreground">
													Search for a valid address to replace this one.
												</p>
											</div>
											<AddressAutocomplete
												bind:value={editAddressValue}
												placeholder="Search for address..."
												onSelect={(location) => handleAddressSelected(originalIndex, location)}
											/>
											<div class="flex justify-end gap-2">
												<Button variant="outline" size="sm" onclick={cancelEditingAddress}>
													Cancel
												</Button>
											</div>
										</div>
									</Popover.Content>
								</Popover.Root>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Warnings -->
	{#if !isGeocoding && errorCount > 0}
		<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
			<div class="flex items-start gap-2">
				<CircleAlert class="mt-0.5 h-4 w-4 flex-shrink-0" />
				<div>
					<div class="font-medium">Failed to geocode {errorCount} address(es)</div>
					<div class="mt-1 text-xs">
						These addresses could not be found. Please check the addresses and try again, or uncheck
						them to continue without importing these stops.
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if !isGeocoding && lowConfidenceCount > 0}
		<div class="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
			<div class="flex items-start gap-2">
				<TriangleAlert class="mt-0.5 h-4 w-4 flex-shrink-0" />
				<div>
					<div class="font-medium">{lowConfidenceCount} address(es) with low confidence</div>
					<div class="mt-1 text-xs">
						These addresses were geocoded, but the results may not be accurate. Please review them
						carefully.
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Navigation -->
	<div class="flex justify-between">
		<Button variant="outline" onclick={onBack} disabled={isGeocoding || isImporting}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back
		</Button>
		<Button onclick={handleImport} disabled={isGeocoding || isImporting || validRowCount === 0}>
			{#if isImporting}
				Importing...
			{:else}
				<Upload class="mr-2 h-4 w-4" />
				Import {validRowCount} Stop(s)
			{/if}
		</Button>
	</div>
</div>
