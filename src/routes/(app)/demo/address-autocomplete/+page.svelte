<script lang="ts">
	import AddressAutocomplete from '$lib/components/AddressAutocomplete.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import type { LocationCreate } from '$lib/schemas/location';

	let selectedAddress = $state('');
	let selectedLocation = $state<LocationCreate | null>(null);
	let createdDepots = $state<any[]>([]);

	function handleAddressSelect(location: LocationCreate) {
		selectedLocation = location;
		console.log('Selected location:', location);
	}

	function handleDepotCreated(depot: any) {
		createdDepots = [...createdDepots, depot];
		console.log('Depot created:', depot);
	}
</script>

<svelte:head>
	<title>Address Autocomplete Demo</title>
</svelte:head>

{#if navigator.geolocation}
	<div class="border-b bg-muted/50 px-8 py-2 text-sm">
		<span class="text-muted-foreground">
			Geolocation: <span class="font-medium text-foreground">available</span>
		</span>
	</div>
{:else}
	<div class="border-b bg-destructive/10 px-8 py-2 text-sm">
		<span class="text-muted-foreground">
			Geolocation: <span class="font-medium text-destructive">Not Available</span>
		</span>
	</div>
{/if}
<div class="container p-8">
	<div class="grid gap-6">
		<!-- Basic Usage -->
		<Card>
			<CardHeader>
				<CardTitle>Basic Address Search</CardTitle>
				<CardDescription>Start typing an address to see suggestions</CardDescription>
			</CardHeader>
			<CardContent>
				<AddressAutocomplete
					bind:value={selectedAddress}
					placeholder="Enter an address..."
					onSelect={handleAddressSelect}
				/>
			</CardContent>
		</Card>

		<!-- Selected Address Details -->
		{#if selectedLocation}
			<Card>
				<CardHeader>
					<CardTitle>Selected Location Details</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="space-y-2 text-sm">
						<div>
							<span class="font-semibold">Name:</span>
							<p class="text-muted-foreground">
								{selectedLocation.name || 'N/A'}
							</p>
						</div>
						<div>
							<span class="font-semibold">Address Line 1:</span>
							<p class="text-muted-foreground">
								{selectedLocation.address_line1}
							</p>
						</div>
						<div>
							<span class="font-semibold">City, Region:</span>
							<p class="text-muted-foreground">
								{selectedLocation.city || 'N/A'}, {selectedLocation.region || 'N/A'}
							</p>
						</div>
						<div>
							<span class="font-semibold">Postal Code:</span>
							<p class="text-muted-foreground">
								{selectedLocation.postal_code || 'N/A'}
							</p>
						</div>
						<div>
							<span class="font-semibold">Country:</span>
							<p class="text-muted-foreground">
								{selectedLocation.country}
							</p>
						</div>
						<div>
							<span class="font-semibold">Coordinates:</span>
							<p class="text-muted-foreground">
								Longitude: {selectedLocation.lon}, Latitude: {selectedLocation.lat}
							</p>
						</div>
						<div>
							<span class="font-semibold">Geocode Confidence:</span>
							<p class="text-muted-foreground">
								{selectedLocation.geocode_confidence || 'N/A'}
							</p>
						</div>
						<div>
							<span class="font-semibold">Provider:</span>
							<p class="text-muted-foreground">
								{selectedLocation.geocode_provider}
							</p>
						</div>
						<div>
							<span class="font-semibold">Place ID:</span>
							<p class="font-mono text-xs text-muted-foreground">
								{selectedLocation.geocode_place_id || 'N/A'}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}

		<!-- Created Depots -->
		{#if createdDepots.length > 0}
			<Card>
				<CardHeader>
					<CardTitle>Created Depots</CardTitle>
					<CardDescription>Depots created during this session</CardDescription>
				</CardHeader>
				<CardContent>
					<ul class="space-y-2">
						{#each createdDepots as depot}
							<li class="rounded border p-3">
								<div class="font-semibold">{depot.name}</div>
								<div class="text-sm text-muted-foreground">
									{depot.location?.address_line1 || 'No address'}
								</div>
							</li>
						{/each}
					</ul>
				</CardContent>
			</Card>
		{/if}
	</div>
</div>

<style>
	:global(body) {
		padding: 0;
		margin: 0;
	}
</style>
