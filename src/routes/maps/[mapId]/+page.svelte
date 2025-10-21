<script lang="ts">
	import MapView from '$lib/components/MapView.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { formatDate } from '$lib/utils';
	import { ArrowLeft, Calendar, FileText, MapPin, Navigation, Phone, User } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.map.title} - Routing Project</title>
</svelte:head>

<div class="mx-auto p-6">
	<!-- Header -->
	<div class="mb-8">
		<Button href="/maps" variant="ghost" size="sm" class="mb-4">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Maps
		</Button>
		<div class="flex items-start justify-between">
			<div>
				<h1 class="headline-large mb-2">{data.map.title}</h1>
				<div class="flex items-center gap-4 text-sm text-muted-foreground">
					<div class="flex items-center">
						<Calendar class="mr-2 h-4 w-4" />
						Created {formatDate(data.map.created_at)}
					</div>
					<Badge variant="secondary">
						<MapPin class="mr-1 h-3 w-3" />
						{data.stops.length}
						{data.stops.length === 1 ? 'Stop' : 'Stops'}
					</Badge>
				</div>
			</div>
			<div class="flex gap-2">
				<Button variant="outline">
					<Navigation class="mr-2 h-4 w-4" />
					Optimize Route
				</Button>
			</div>
		</div>
	</div>

	<!-- Map View -->
	{#if data.stops.length > 0}
		<div class="mb-8">
			<MapView stops={data.stops} />
		</div>
	{/if}

	<!-- Stops Table -->
	{#if data.stops.length === 0}
		<Card>
			<CardContent class="flex flex-col items-center justify-center py-16">
				<MapPin class="mb-4 h-16 w-16 text-muted-foreground" />
				<h3 class="headline-small mb-2">No Stops Yet</h3>
				<p class="body-medium text-center text-muted-foreground">
					Upload a CSV file to add stops to this map.
				</p>
			</CardContent>
		</Card>
	{:else}
		<div class="rounded-md border bg-card">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Contact</Table.Head>
						<Table.Head>Address</Table.Head>
						<Table.Head>Coordinates</Table.Head>
						<Table.Head>Confidence</Table.Head>
						<Table.Head>Phone</Table.Head>
						<Table.Head>Notes</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.stops as { stop, location }}
						<Table.Row>
							<Table.Cell>
								<div class="flex items-center">
									<User class="mr-2 h-4 w-4 flex-shrink-0 text-primary" />
									<span class="font-semibold">{stop.contact_name}</span>
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-start">
									<MapPin class="mt-0.5 mr-2 h-4 w-4 flex-shrink-0 text-primary" />
									<div class="text-sm">
										<div class="font-medium">{location.address_line1}</div>
										<div class="text-muted-foreground">
											{location.city}, {location.region}
											{location.postal_code}
										</div>
									</div>
								</div>
							</Table.Cell>
							<Table.Cell class="font-mono text-sm">
								{location.lat && location.lon
									? `${parseFloat(location.lat).toFixed(6)}, ${parseFloat(location.lon).toFixed(6)}`
									: 'N/A'}
							</Table.Cell>
							<Table.Cell>
								<Badge variant="outline">
									{location.geocode_confidence
										? parseFloat(location.geocode_confidence).toFixed(1)
										: 'N/A'}%
								</Badge>
							</Table.Cell>
							<Table.Cell>
								{#if stop.contact_phone}
									<div class="flex items-center text-sm">
										<Phone class="mr-2 h-3 w-3 text-primary" />
										{stop.contact_phone}
									</div>
								{:else}
									<span class="text-sm text-muted-foreground">—</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								{#if stop.notes}
									<div class="flex items-start text-sm">
										<FileText class="mt-0.5 mr-2 h-3 w-3 text-primary" />
										<span class="max-w-[200px] truncate">{stop.notes}</span>
									</div>
								{:else}
									<span class="text-sm text-muted-foreground">—</span>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		background: linear-gradient(to bottom right, hsl(var(--background)), hsl(var(--muted)));
		min-height: 100vh;
	}
</style>
