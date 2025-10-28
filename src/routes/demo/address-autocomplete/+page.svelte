<script lang="ts">
	import AddressAutocomplete from '$lib/components/AddressAutocomplete.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import type { GeocodingFeature } from '$lib/services/external/mapbox/types';
	import CreateDepot from '../../../lib/components/CreateDepotPopover.svelte';

	let selectedAddress = $state('');
	let selectedFeature = $state<GeocodingFeature | null>(null);
	let createdDepots = $state<any[]>([]);

	function handleAddressSelect(feature: GeocodingFeature) {
		selectedFeature = feature;
		console.log('Selected address:', feature);
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
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold">Address Autocomplete Demo</h1>
			<p class="text-muted-foreground">Try typing an address to see the autocomplete in action</p>
		</div>
		<CreateDepot onSuccess={handleDepotCreated} />
	</div>

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
		{#if selectedFeature}
			<Card>
				<CardHeader>
					<CardTitle>Selected Address Details</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="space-y-2 text-sm">
						<div>
							<span class="font-semibold">Full Address:</span>
							<p class="text-muted-foreground">
								{selectedFeature.properties.full_address ||
									selectedFeature.properties.place_formatted ||
									selectedFeature.properties.name}
							</p>
						</div>
						<div>
							<span class="font-semibold">Coordinates:</span>
							<p class="text-muted-foreground">
								Longitude: {selectedFeature.geometry.coordinates[0].toFixed(6)}, Latitude: {selectedFeature.geometry.coordinates[1].toFixed(
									6
								)}
							</p>
						</div>
						<div>
							<span class="font-semibold">Feature Type:</span>
							<p class="text-muted-foreground">{selectedFeature.properties.feature_type}</p>
						</div>
						<div>
							<span class="font-semibold">Mapbox ID:</span>
							<p class="font-mono text-xs text-muted-foreground">
								{selectedFeature.properties.mapbox_id}
							</p>
						</div>
						{#if selectedFeature.properties.context}
							<div>
								<span class="font-semibold">Context:</span>
								<ul class="list-inside list-disc text-muted-foreground">
									{#if selectedFeature.properties.context.address}
										<li>Address: {selectedFeature.properties.context.address.name}</li>
									{/if}
									{#if selectedFeature.properties.context.street}
										<li>Street: {selectedFeature.properties.context.street.name}</li>
									{/if}
									{#if selectedFeature.properties.context.neighborhood}
										<li>Neighborhood: {selectedFeature.properties.context.neighborhood.name}</li>
									{/if}
									{#if selectedFeature.properties.context.postcode}
										<li>Postcode: {selectedFeature.properties.context.postcode.name}</li>
									{/if}
									{#if selectedFeature.properties.context.place}
										<li>Place: {selectedFeature.properties.context.place.name}</li>
									{/if}
									{#if selectedFeature.properties.context.region}
										<li>Region: {selectedFeature.properties.context.region.name}</li>
									{/if}
									{#if selectedFeature.properties.context.country}
										<li>Country: {selectedFeature.properties.context.country.name}</li>
									{/if}
								</ul>
							</div>
						{/if}
					</div>
				</CardContent>
			</Card>
		{/if}

		<!-- Created Depots -->
		{#if createdDepots.length > 0}
			<Card>
				<CardHeader>
					<CardTitle>Created Depots ({createdDepots.length})</CardTitle>
					<CardDescription>Depots created during this session</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-4">
						{#each createdDepots as depot}
							<div class="rounded-lg border p-4">
								<div class="mb-2 flex items-start justify-between">
									<div>
										<h4 class="font-semibold">{depot.name}</h4>
										{#if depot.default_depot}
											<span
												class="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
											>
												Default Depot
											</span>
										{/if}
									</div>
								</div>
								<div class="text-sm text-muted-foreground">
									<p>
										{depot.location.properties?.full_address ||
											depot.location.properties?.place_formatted ||
											depot.location.properties?.name ||
											'Unknown address'}
									</p>
									<p class="mt-1">
										Coordinates: {depot.location.geometry.coordinates[0].toFixed(6)}, {depot.location.geometry.coordinates[1].toFixed(
											6
										)}
									</p>
								</div>
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>
		{/if}

		<!-- Code Example -->
		<Card>
			<CardHeader>
				<CardTitle>Usage Example</CardTitle>
			</CardHeader>
			<CardContent>
				<pre class="overflow-x-auto rounded-md bg-muted p-4 text-sm"><code
						>{`<script lang="ts">
  import AddressAutocomplete from '$lib/components/AddressAutocomplete.svelte';
  import type { GeocodingFeature } from '$lib/services/external/mapbox/types';

  let address = $state('');

  function handleSelect(feature: GeocodingFeature) {
    console.log('Selected:', feature.properties.full_address);
    console.log('Coordinates:', feature.geometry.coordinates);
    console.log('Feature type:', feature.properties.feature_type);
  }
<\/script>

<AddressAutocomplete
  bind:value={address}
  placeholder="Enter an address..."
  country="US"
  onSelect={handleSelect}
/>`}</code
					></pre>
			</CardContent>
		</Card>
	</div>
</div>
