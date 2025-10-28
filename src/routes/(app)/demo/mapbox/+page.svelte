<script lang="ts">
	import { page } from '$app/state';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';

	import * as Form from '$lib/components/ui/form/index.js';
	import type { GeocodingResponse } from '$lib/services/external/mapbox/types';
	import {
		Check,
		CircleAlert,
		CircleCheck,
		LucideChartNoAxesColumnDecreasing,
		MapPin
	} from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { z } from 'zod';
	import type { PageProps } from './$types.ts';

	let { data }: PageProps = $props();

	// Client-side schema matching the server
	const addressSchema = z.object({
		address: z
			.string()
			.min(1, 'Address is required')
			.max(500, 'Address is too long')
			.refine((val) => val.trim().length > 0, 'Address cannot be empty')
	});

	const form = superForm(data.form, {
		validators: zodClient(addressSchema),
		onUpdate(event) {
			if (event.result.type == 'success') {
				results = event.result.data.response;
			}
		}
	});
	const { form: formData, enhance } = form;

	// Mock results for styling purposes - "5106 Tari" query
	const mockResults: GeocodingResponse = {
		type: 'FeatureCollection',
		query: ['5106', 'tari'],
		features: [
			{
				id: 'address.1234567890',
				type: 'Feature',
				place_type: ['address'],
				relevance: 0.99,
				properties: {},
				text: 'Tari Dr',
				place_name: '5106 Tari Dr, Austin, Texas 78723, United States',
				center: [-97.689, 30.3201],
				geometry: {
					type: 'Point',
					coordinates: [-97.689, 30.3201]
				},
				address: '5106'
			},
			{
				id: 'address.0987654321',
				type: 'Feature',
				place_type: ['address'],
				relevance: 0.95,
				properties: {},
				text: 'Tari Ln',
				place_name: '5106 Tari Ln, Houston, Texas 77088, United States',
				center: [-95.4235, 29.8654],
				geometry: {
					type: 'Point',
					coordinates: [-95.4235, 29.8654]
				},
				address: '5106'
			},
			{
				id: 'address.1122334455',
				type: 'Feature',
				place_type: ['address'],
				relevance: 0.92,
				properties: {},
				text: 'Tari St',
				place_name: '5106 Tari St, Dallas, Texas 75243, United States',
				center: [-96.7804, 32.7157],
				geometry: {
					type: 'Point',
					coordinates: [-96.7804, 32.7157]
				},
				address: '5106'
			}
		],
		attribution: 'NOTICE: © 2023 Mapbox and its suppliers. All rights reserved.'
	};

	// 🎨 STYLING MODE: Set to true to show mock results, false for live API calls
	const SHOW_MOCK_RESULTS = true;

	// Set to mock results for styling (change SHOW_MOCK_RESULTS to false for production)
	let results: GeocodingResponse | null = $state(SHOW_MOCK_RESULTS ? mockResults : null);
</script>

<svelte:head>
	<title>{data.title}</title>
</svelte:head>

<div class="bg-gradient-to-br from-background via-muted to-secondary p-6">
	<div class="container mx-auto max-w-4xl">
		<div class="mb-8 text-center">
			<h1 class="headline-large mb-4">Mapbox Geocoding Demo</h1>
			<p class="body-large text-muted-foreground">
				Convert addresses to coordinates with precision
			</p>
		</div>

		<Card class="mb-8 shadow-lg">
			<CardHeader>
				<CardTitle class="headline-card">Address Geocoding</CardTitle>
				<CardDescription class="body-medium">
					Enter any address to get precise coordinates and location details
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form method="POST" action="?/geocode" use:enhance class="space-y-6" novalidate>
					<Form.Field {form} name="address">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label class="body-medium">Address</Form.Label>
								<Input
									{...props}
									type="text"
									placeholder="e.g., 1600 Pennsylvania Avenue, Washington, DC"
									bind:value={$formData.address}
								/>
							{/snippet}
						</Form.Control>
						<Form.Description class="body-small text-muted-foreground"
							>Enter any US address for geocoding.</Form.Description
						>
						<Form.FieldErrors />
					</Form.Field>

					<Button type="submit" class="w-full" size="lg">
						<MapPin class="mr-2 h-4 w-4" />
						Geocode Address
					</Button>

					{#if form.message && page.status >= 400}
						<Alert.Root variant="destructive" class="border-red-200 bg-red-50">
							<CircleAlert class="h-4 w-4 text-red-600" />
							<Alert.Title class="text-red-800">Error</Alert.Title>
							<Alert.Description class="text-red-700">{form.message}</Alert.Description>
						</Alert.Root>
					{/if}
				</form>
			</CardContent>
		</Card>

		{#if results}
			<Card class="mb-8 shadow-lg">
				<CardHeader>
					<CardTitle class="headline-card flex items-center">
						<CircleCheck class="mr-2 h-5 w-5 text-primary" />
						Geocoding Results
					</CardTitle>
					<CardDescription class="body-medium">
						Found {results.features.length} result(s) for "{$formData.address}"
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="rounded-md border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head class="w-12">#</Table.Head>
									<Table.Head>Address</Table.Head>
									<Table.Head>Coordinates</Table.Head>
									<Table.Head>Type</Table.Head>
									<Table.Head class="text-right">Relevance</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each results.features as feature, index}
									<Table.Row>
										<Table.Cell class="font-medium">{index + 1}</Table.Cell>
										<Table.Cell>
											<div class="flex items-start">
												<MapPin class="mt-0.5 mr-2 h-4 w-4 flex-shrink-0 text-primary" />
												<span>{feature.place_name}</span>
											</div>
										</Table.Cell>
										<Table.Cell class="font-mono text-sm">
											{feature.center[1].toFixed(6)}, {feature.center[0].toFixed(6)}
										</Table.Cell>
										<Table.Cell>
											<div class="flex flex-wrap gap-1">
												{#each feature.place_type as type}
													<span
														class="body-small rounded-full bg-secondary px-2 py-1 font-medium text-secondary-foreground"
													>
														{type}
													</span>
												{/each}
											</div>
										</Table.Cell>
										<Table.Cell class="text-right">
											<div class="flex items-center justify-end">
												<LucideChartNoAxesColumnDecreasing class="mr-2 h-4 w-4 text-primary" />
												<span>{(feature.relevance * 100).toFixed(1)}%</span>
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</CardContent>
			</Card>
		{/if}

		<Card class="shadow-lg">
			<CardHeader>
				<CardTitle class="headline">About this demo</CardTitle>
			</CardHeader>
			<CardContent>
				<ul class="body-medium space-y-2">
					<li class="flex items-start">
						<Check class="mt-0.5 mr-2 h-4 w-4 text-primary" />
						Uses the Mapbox Geocoding API to convert addresses to coordinates
					</li>
					<li class="flex items-start">
						<Check class="mt-0.5 mr-2 h-4 w-4 text-primary" />
						Limited to US addresses for this demo
					</li>
					<li class="flex items-start">
						<Check class="mt-0.5 mr-2 h-4 w-4 text-primary" />
						Returns up to 5 results ordered by relevance
					</li>
					<li class="flex items-start">
						<Check class="mt-0.5 mr-2 h-4 w-4 text-primary" />
						Built with type-safe Zod validation and error handling
					</li>
				</ul>
			</CardContent>
		</Card>
	</div>
</div>
