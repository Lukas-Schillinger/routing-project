<script lang="ts">
	import AddressAutocomplete from '$lib/components/AddressAutocomplete.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import type { GeocodingFeature } from '$lib/services/mapbox-geocoding';

	let selectedAddress = $state('');
	let selectedFeature = $state<GeocodingFeature | null>(null);

	function handleAddressSelect(feature: GeocodingFeature) {
		selectedFeature = feature;
		console.log('Selected address:', feature);
	}
</script>

<div class="container mx-auto p-8">
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold">Address Autocomplete Demo</h1>
		<p class="text-muted-foreground">Try typing an address to see the autocomplete in action</p>
	</div>

	<div class="grid max-w-2xl gap-6">
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
							<p class="text-muted-foreground">{selectedFeature.place_name}</p>
						</div>
						<div>
							<span class="font-semibold">Coordinates:</span>
							<p class="text-muted-foreground">
								Longitude: {selectedFeature.center[0].toFixed(6)}, Latitude: {selectedFeature.center[1].toFixed(
									6
								)}
							</p>
						</div>
						<div>
							<span class="font-semibold">Place Type:</span>
							<p class="text-muted-foreground">{selectedFeature.place_type.join(', ')}</p>
						</div>
						<div>
							<span class="font-semibold">Relevance:</span>
							<p class="text-muted-foreground">{(selectedFeature.relevance * 100).toFixed(0)}%</p>
						</div>
						{#if selectedFeature.context}
							<div>
								<span class="font-semibold">Context:</span>
								<ul class="list-inside list-disc text-muted-foreground">
									{#each selectedFeature.context as ctx}
										<li>{ctx.text}</li>
									{/each}
								</ul>
							</div>
						{/if}
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
  import type { GeocodingFeature } from '$lib/services/mapbox-geocoding';

  let address = $state('');

  function handleSelect(feature: GeocodingFeature) {
    console.log('Selected:', feature.place_name);
    console.log('Coordinates:', feature.center);
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
