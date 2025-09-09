<script lang="ts">
	import type { ActionData, PageData } from './$types.ts';

	export let data: PageData;
	export let form: ActionData;
</script>

<svelte:head>
	<title>{data.title}</title>
</svelte:head>

<div class="container mx-auto max-w-2xl p-6">
	<h1 class="mb-6 text-3xl font-bold">Mapbox Geocoding Demo</h1>

	<div class="rounded-lg bg-white p-6 shadow-md">
		<form method="POST" action="?/geocode" class="space-y-4" novalidate>
			<div>
				<label for="address" class="mb-2 block text-sm font-medium text-gray-700">
					Enter an address to geocode:
				</label>
				<input
					type="text"
					id="address"
					name="address"
					value={form?.address || ''}
					placeholder="e.g., 1600 Pennsylvania Avenue, Washington, DC"
					class="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					class:border-red-300={form?.errors?.address}
					required
				/>
				{#if form?.errors?.address}
					<p class="mt-1 text-sm text-red-600">{form.errors.address[0]}</p>
				{/if}
			</div>

			<button
				type="submit"
				class="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
			>
				Geocode Address
			</button>

			{#if form?.errors?.general}
				<div class="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
					<p class="text-sm text-red-600">{form.errors.general[0]}</p>
				</div>
			{/if}
		</form>

		{#if form?.success && form?.response}
			<div class="mt-6 rounded-md border border-green-200 bg-green-50 p-4">
				<h3 class="mb-3 text-lg font-medium text-green-800">Geocoding Results</h3>
				<p class="mb-4 text-sm text-green-700">
					Found {form.response.features.length} result(s) for "{form.address}"
				</p>

				<div class="space-y-3">
					{#each form.response.features as feature, index}
						<div class="rounded border bg-white p-3">
							<div class="mb-2 flex items-start justify-between">
								<h4 class="font-medium text-gray-900">#{index + 1}: {feature.place_name}</h4>
								<span class="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
									{feature.place_type.join(', ')}
								</span>
							</div>
							<div class="text-sm text-gray-600">
								<p><strong>Coordinates:</strong> {feature.center[1]}, {feature.center[0]}</p>
								<p><strong>Relevance:</strong> {(feature.relevance * 100).toFixed(1)}%</p>
								{#if feature.address}
									<p><strong>Address:</strong> {feature.address}</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<div class="mt-8 text-sm text-gray-600">
		<h3 class="mb-2 font-medium">About this demo:</h3>
		<ul class="list-inside list-disc space-y-1">
			<li>Uses the Mapbox Geocoding API to convert addresses to coordinates</li>
			<li>Limited to US addresses for this demo</li>
			<li>Returns up to 5 results ordered by relevance</li>
			<li>Built with type-safe Zod validation and error handling</li>
		</ul>
	</div>
</div>

<style>
	.container {
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}
</style>
