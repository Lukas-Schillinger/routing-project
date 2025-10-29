<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import MapView from '$lib/components/MapView.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { ApiError, mapApi } from '$lib/services/api';
	import { Building2, MapPin, Route, Sparkles, Truck } from 'lucide-svelte';
	import { getContext } from 'svelte';
	import type { PageData } from './$types';
	import EditDriversTable from './tables/EditDriversTable.svelte';
	import EditStopsDataTable from './tables/EditStopsDataTable';
	import ViewDriversTable from './tables/ViewDriversTable.svelte';
	import ViewRoutesTable from './tables/ViewRoutesTable.svelte';

	let { data }: { data: PageData } = $props();

	// Set page header in layout context
	const pageHeaderContext = getContext<{ set: (header: any) => void }>('pageHeader');

	if (pageHeaderContext) {
		pageHeaderContext.set({
			title: data.map.title,
			breadcrumbs: [
				{ name: 'Maps', href: '/maps' },
				{ name: data.map.title, href: `/maps/${data.map.id}` }
			]
		});
	}

	let isLoading = $state(false);
	let errorMessage = $state('');
	let isOptimizing = $state(false);
	let optimizationResult = $state<any>(null);
	let optimizationError = $state('');
	let isViewMode = $state((data as any).isViewMode ?? false);
	let selectedDepotId = $state<string | undefined>(undefined);

	// Update view mode when data changes
	$effect(() => {
		isViewMode = (data as any).isViewMode ?? false;
	});

	// Set default depot if available
	$effect(() => {
		if (data.depots.length > 0 && !selectedDepotId) {
			const defaultDepot = data.depots.find((d) => d.depot.default_depot);
			selectedDepotId = defaultDepot?.depot.id || data.depots[0].depot.id;
		}
	});

	async function removeDriver(routeId: string) {
		if (isLoading) return;

		if (!confirm('Are you sure you want to remove this driver from the map?')) {
			return;
		}

		isLoading = true;
		errorMessage = '';

		try {
			await mapApi.removeDriver(data.map.id, routeId);

			// Refresh the page data
			await invalidateAll();
		} catch (err) {
			errorMessage = err instanceof ApiError ? err.message : 'Failed to remove driver';
			console.error('Error removing driver:', err);
		} finally {
			isLoading = false;
		}
	}

	async function optimizeRoutes() {
		if (isOptimizing) return;

		// Check if there are depots
		if (data.depots.length === 0) {
			optimizationError = 'Please create at least one depot before optimizing routes';
			return;
		}

		// Check if a depot is selected
		if (!selectedDepotId) {
			optimizationError = 'Please select a depot for route optimization';
			return;
		}

		// Check if there are drivers assigned
		if (data.assignedDrivers.length === 0) {
			optimizationError = 'Please assign at least one driver before optimizing routes';
			return;
		}

		// Check if there are stops
		if (data.stops.length === 0) {
			optimizationError = 'Please add stops to the map before optimizing routes';
			return;
		}

		isOptimizing = true;
		optimizationError = '';
		optimizationResult = null;

		try {
			console.log('Starting Optimization');
			const res = await mapApi.optimize(data.map.id, {
				depotId: selectedDepotId,
				fairness: 'medium', // Options: 'high', 'medium', 'low'
				timeLimitSec: 30, // Optimization time limit
				startAtDepot: true, // Routes start at depot
				endAtDepot: true // Routes end at depot
			});
			console.log('Optimization Finished');
			optimizationResult = res.result;
			console.log(optimizationResult);

			// Switch to view mode after successful optimization
			isViewMode = true;

			// Refresh the page data to show updated routes
			await invalidateAll();
		} catch (err) {
			optimizationError = err instanceof Error ? err.message : 'Failed to optimize routes';
			console.error('Error optimizing routes:', err);
		} finally {
			isOptimizing = false;
		}
	}

	async function switchToEditMode() {
		if (isLoading) return;

		if (
			!confirm(
				'Switching to edit mode will remove all optimized route stops. Are you sure you want to continue?'
			)
		) {
			return;
		}

		isLoading = true;
		errorMessage = '';

		try {
			await mapApi.resetOptimization(data.map.id);

			// Switch to edit mode
			isViewMode = false;
			optimizationResult = null;

			// Refresh the page data
			await invalidateAll();
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to switch to edit mode';
			console.error('Error switching to edit mode:', err);
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{data.map.title} - Routing Project</title>
</svelte:head>

<div class="space-y-6">
	<!-- Map -->
	{#if data.stops.length > 0}
		<div class="h-[500px]">
			<MapView stops={data.stops} />
		</div>
	{/if}

	<!-- Optimization Results -->
	{#if optimizationResult}
		<Card class="border-green-500 shadow-lg">
			<CardHeader>
				<CardTitle class="text-green-600">✓ Optimization Complete</CardTitle>
				<CardDescription>Route optimization results</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					<!-- Summary Stats -->
					<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
						<div class="rounded-lg border bg-card p-4">
							<div class="text-2xl font-bold">
								{optimizationResult.summary.totalDrivers}
							</div>
							<div class="text-sm text-muted-foreground">Drivers</div>
						</div>
						<div class="rounded-lg border bg-card p-4">
							<div class="text-2xl font-bold">
								{optimizationResult.summary.totalStops}
							</div>
							<div class="text-sm text-muted-foreground">Stops</div>
						</div>
						<div class="rounded-lg border bg-card p-4">
							<div class="text-2xl font-bold">
								{(optimizationResult.summary.totalDistance / 1000).toFixed(1)}km
							</div>
							<div class="text-sm text-muted-foreground">Total Distance</div>
						</div>
						<div class="rounded-lg border bg-card p-4">
							<div class="text-2xl font-bold">
								{Math.round(optimizationResult.summary.totalDuration / 60)}min
							</div>
							<div class="text-sm text-muted-foreground">Total Duration</div>
						</div>
						<div class="rounded-lg border bg-card p-4">
							<div class="text-2xl font-bold">
								{Math.round(optimizationResult.summary.totalServiceTime / 60)}min
							</div>
							<div class="text-sm text-muted-foreground">Service Time</div>
						</div>
					</div>

					<!-- Unassigned Stops -->
					{#if optimizationResult.unassigned.length > 0}
						<div class="rounded-lg border border-amber-500 bg-amber-50 p-4">
							<h4 class="mb-2 font-semibold text-amber-800">
								⚠️ Unassigned Stops ({optimizationResult.unassigned.length})
							</h4>
							<ul class="space-y-1 text-sm text-amber-700">
								{#each optimizationResult.unassigned as stop}
									<li>
										• Stop {stop.stopId}: {stop.reason || 'Unknown reason'}
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					<!-- Full JSON Result -->
					<details class="rounded-lg border bg-muted p-4">
						<summary class="cursor-pointer font-semibold">View Full JSON Result</summary>
						<pre
							class="mt-4 overflow-auto rounded bg-black p-4 text-xs text-green-400">{JSON.stringify(
								optimizationResult,
								null,
								2
							)}</pre>
					</details>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Optimization Error -->
	{#if optimizationError}
		<Card class="border-destructive shadow-lg">
			<CardContent class="pt-6">
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					<strong>Optimization Error:</strong>
					{optimizationError}
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Routes Section (View Mode Only) -->
	{#if isViewMode}
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Route class="h-5 w-5 text-primary" />
					Optimized Routes
				</CardTitle>
				<CardDescription>Stops organized by driver in optimal delivery order</CardDescription>
			</CardHeader>
			<CardContent>
				<ViewRoutesTable stops={data.stops} assignedDrivers={data.assignedDrivers} />
			</CardContent>
		</Card>
	{/if}

	<!-- Stops Section (Edit Mode Only) -->
	{#if !isViewMode}
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<MapPin class="h-5 w-5 text-primary" />
					Stops
				</CardTitle>
				<CardDescription>Where you're going.</CardDescription>
			</CardHeader>
			<CardContent>
				<EditStopsDataTable
					stops={data.stops}
					mapId={data.map.id}
					onUpdate={() => invalidateAll()}
					onCreate={() => invalidateAll()}
				/>
			</CardContent>
		</Card>
	{/if}

	<!-- Drivers Section -->
	<Card class="shadow-lg">
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Truck class="h-5 w-5 text-primary" />
				Drivers
			</CardTitle>
			<CardDescription>
				{#if isViewMode}
					Drivers assigned to this optimized map
				{:else}
					Assign drivers to this map for route optimization
				{/if}
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<!-- View Mode Info -->
			{#if isViewMode}
				<div class="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
					<strong>View Mode:</strong> Routes have been optimized. Switch to Edit Mode to make changes
					to drivers or stops.
				</div>
			{/if}

			<!-- Error Message -->
			{#if errorMessage}
				<div
					class="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
				>
					{errorMessage}
				</div>
			{/if}

			<!-- Drivers Table -->
			{#if isViewMode}
				<ViewDriversTable assignedDrivers={data.assignedDrivers} isOptimized={data.isViewMode} />
			{:else}
				<EditDriversTable
					assignedDrivers={data.assignedDrivers}
					allDrivers={data.allDrivers}
					mapId={data.map.id}
					{isLoading}
					onRemoveDriver={removeDriver}
				/>
			{/if}
		</CardContent>
	</Card>

	<!-- Optimization Section -->
	{#if !isViewMode}
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Building2 class="h-5 w-5 text-primary" />
					Route Optimization
				</CardTitle>
				<CardDescription>Configure and optimize delivery routes</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<!-- Depot Selection -->
				<div class="space-y-2">
					<Label for="depot-select">Starting Depot</Label>
					{#if data.depots.length === 0}
						<p class="text-sm text-muted-foreground">
							No depots available. Please create a depot before optimizing routes.
						</p>
					{:else}
						<Select.Root type="single" bind:value={selectedDepotId}>
							<Select.Trigger id="depot-select" class="w-full">
								{#if selectedDepotId}
									{@const selectedDepot = data.depots.find((d) => d.depot.id === selectedDepotId)}
									{#if selectedDepot}
										<div class="flex items-center gap-2">
											<Building2 class="h-4 w-4" />
											<span>{selectedDepot.depot.name}</span>
										</div>
									{/if}
								{:else}
									<span class="text-muted-foreground">Select a depot</span>
								{/if}
							</Select.Trigger>
							<Select.Content>
								{#each data.depots as { depot, location }}
									<Select.Item value={depot.id}>
										<div class="flex items-center gap-2">
											<Building2 class="h-4 w-4" />
											<div>
												<div class="font-medium">{depot.name}</div>
												<div class="text-xs text-muted-foreground">
													{location.address_line1}
												</div>
											</div>
											{#if depot.default_depot}
												<span class="ml-auto text-xs text-primary">(Default)</span>
											{/if}
										</div>
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					{/if}
				</div>

				<!-- Optimize Button -->
				<div class="flex justify-center pt-2">
					<Button
						size="lg"
						onclick={optimizeRoutes}
						disabled={isOptimizing ||
							!selectedDepotId ||
							data.depots.length === 0 ||
							data.assignedDrivers.length === 0 ||
							data.stops.length === 0}
						class="gap-2"
					>
						{#if isOptimizing}
							<Sparkles class="h-5 w-5 animate-spin" />
							Optimizing Routes...
						{:else}
							<Sparkles class="h-5 w-5" />
							Optimize Routes
						{/if}
					</Button>
				</div>
			</CardContent>
		</Card>
	{:else}
		<div class="flex justify-center">
			<Button size="lg" onclick={switchToEditMode} disabled={isLoading} variant="outline">
				Switch to Edit Mode
			</Button>
		</div>
	{/if}
</div>
