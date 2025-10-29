<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import type { DistanceMatrixResult } from '$lib/services/external/mapbox';
	import { Building2, MapPin } from 'lucide-svelte';

	let {
		data
	}: {
		data: {
			title: string;
			mapId: string;
			depotId: string;
			depotName: string;
			result: DistanceMatrixResult;
		};
	} = $props();

	// Helper to format distance (meters to km/miles)
	const formatDistance = (meters: number | null): string => {
		if (meters === null) return 'N/A';
		const km = meters / 1000;
		return `${km.toFixed(2)} km`;
	};

	// Helper to format duration (seconds to hours/minutes)
	const formatDuration = (seconds: number | null): string => {
		if (seconds === null) return 'N/A';
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		} else if (minutes > 0) {
			return `${minutes}m ${secs}s`;
		} else {
			return `${secs}s`;
		}
	};

	// Helper to get cell background color based on value
	const getCellStyle = (value: number | null, max: number): string => {
		if (value === null || value === 0) return '';
		const intensity = Math.min((value / max) * 100, 100);
		return `background-color: rgba(59, 130, 246, ${intensity / 200})`; // blue with varying opacity
	};
</script>

<div class="container mx-auto py-8">
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold">Distance Matrix Demo</h1>
		<p class="text-muted-foreground">
			Map ID: <code class="rounded bg-muted px-2 py-1">{data.mapId}</code>
		</p>
		<p class="text-muted-foreground">
			Depot: <Building2 class="inline h-4 w-4" />
			{data.depotName}
			<code class="ml-2 rounded bg-muted px-2 py-1">{data.depotId}</code>
		</p>
	</div>

	<!-- Summary Cards -->
	<div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
		<Card>
			<CardHeader>
				<CardTitle>Locations</CardTitle>
				<CardDescription>Total points in matrix</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-3xl font-bold">{data.result.addresses.length}</p>
				<p class="mt-2 text-sm text-muted-foreground">
					1 depot + {data.result.addresses.length - 1} stops
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Matrix Size</CardTitle>
				<CardDescription>Source × Destination pairs</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-3xl font-bold">
					{data.result.addresses.length}×{data.result.addresses.length}
				</p>
				<p class="mt-2 text-sm text-muted-foreground">
					= {data.result.addresses.length * data.result.addresses.length} elements
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Profile</CardTitle>
				<CardDescription>Routing mode used</CardDescription>
			</CardHeader>
			<CardContent>
				<p class="text-3xl font-bold">Driving</p>
				<p class="mt-2 text-sm text-muted-foreground">
					{data.result.rawResponse.code === 'Ok' ? '✓ Success' : '✗ Failed'}
				</p>
			</CardContent>
		</Card>
	</div>

	<!-- Locations List -->
	<Card class="mb-8">
		<CardHeader>
			<CardTitle>Locations (in matrix order)</CardTitle>
			<CardDescription>Depot is always first, followed by stops</CardDescription>
		</CardHeader>
		<CardContent>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-16">Index</Table.Head>
						<Table.Head>Address</Table.Head>
						<Table.Head>Coordinates</Table.Head>
						<Table.Head>Type</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.result.addresses as address, i}
						<Table.Row>
							<Table.Cell class="font-mono">{i}</Table.Cell>
							<Table.Cell>
								{#if i === 0}
									<Building2 class="mr-2 inline h-4 w-4" />
								{:else}
									<MapPin class="mr-2 inline h-4 w-4" />
								{/if}
								{address}
							</Table.Cell>
							<Table.Cell class="font-mono text-sm">
								{data.result.coordinates[i][0].toFixed(6)}, {data.result.coordinates[i][1].toFixed(
									6
								)}
							</Table.Cell>
							<Table.Cell>
								{#if i === 0}
									<Badge variant="default">Depot</Badge>
								{:else}
									<Badge variant="secondary">Stop</Badge>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</CardContent>
	</Card>

	<!-- Distance Matrix -->
	<Card class="mb-8">
		<CardHeader>
			<CardTitle>Distance Matrix (meters)</CardTitle>
			<CardDescription>Travel distances from source (row) to destination (column)</CardDescription>
		</CardHeader>
		<CardContent class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="sticky left-0 z-10 bg-background">From / To</Table.Head>
						{#each data.result.addresses as address, i}
							<Table.Head class="min-w-[100px] text-center">
								<div class="flex flex-col items-center">
									{#if i === 0}
										<Building2 class="mb-1 h-4 w-4" />
									{:else}
										<MapPin class="mb-1 h-4 w-4" />
									{/if}
									<span class="text-xs">[{i}]</span>
								</div>
							</Table.Head>
						{/each}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.result.distances as row, i}
						{@const maxDistance = Math.max(
							...row.filter((v): v is number => v !== null && v !== 0).map((v) => v)
						)}
						<Table.Row>
							<Table.Cell class="sticky left-0 z-10 bg-background font-medium">
								<div class="flex items-center gap-2">
									{#if i === 0}
										<Building2 class="h-4 w-4" />
									{:else}
										<MapPin class="h-4 w-4" />
									{/if}
									<span>[{i}]</span>
								</div>
							</Table.Cell>
							{#each row as distance, j}
								<Table.Cell
									class="text-center font-mono text-sm"
									style={getCellStyle(distance, maxDistance)}
								>
									{#if i === j}
										<span class="text-muted-foreground">0</span>
									{:else}
										{formatDistance(distance)}
									{/if}
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</CardContent>
	</Card>

	<!-- Duration Matrix -->
	<Card class="mb-8">
		<CardHeader>
			<CardTitle>Duration Matrix (seconds)</CardTitle>
			<CardDescription>Travel times from source (row) to destination (column)</CardDescription>
		</CardHeader>
		<CardContent class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="sticky left-0 z-10 bg-background">From / To</Table.Head>
						{#each data.result.addresses as address, i}
							<Table.Head class="min-w-[100px] text-center">
								<div class="flex flex-col items-center">
									{#if i === 0}
										<Building2 class="mb-1 h-4 w-4" />
									{:else}
										<MapPin class="mb-1 h-4 w-4" />
									{/if}
									<span class="text-xs">[{i}]</span>
								</div>
							</Table.Head>
						{/each}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.result.durations as row, i}
						{@const maxDuration = Math.max(
							...row.filter((v): v is number => v !== null && v !== 0).map((v) => v)
						)}
						<Table.Row>
							<Table.Cell class="sticky left-0 z-10 bg-background font-medium">
								<div class="flex items-center gap-2">
									{#if i === 0}
										<Building2 class="h-4 w-4" />
									{:else}
										<MapPin class="h-4 w-4" />
									{/if}
									<span>[{i}]</span>
								</div>
							</Table.Cell>
							{#each row as duration, j}
								<Table.Cell
									class="text-center font-mono text-sm"
									style={getCellStyle(duration, maxDuration)}
								>
									{#if i === j}
										<span class="text-muted-foreground">0</span>
									{:else}
										{formatDuration(duration)}
									{/if}
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</CardContent>
	</Card>

	<!-- Raw JSON Response -->
	<Card>
		<CardHeader>
			<CardTitle>Raw JSON Response</CardTitle>
			<CardDescription>Complete Mapbox API response data</CardDescription>
		</CardHeader>
		<CardContent>
			<pre class="overflow-x-auto rounded-lg bg-muted p-4 text-xs">{JSON.stringify(
					data.result,
					null,
					2
				)}</pre>
		</CardContent>
	</Card>
</div>
