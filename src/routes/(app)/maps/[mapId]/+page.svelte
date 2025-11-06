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
	import type { Driver } from '$lib/schemas';
	import { ApiError, mapApi } from '$lib/services/api';
	import { MapPin, Route, Truck } from 'lucide-svelte';
	import { getContext } from 'svelte';
	import type { PageData } from './$types';
	import OptimizationCard from './OptimizationCard/';
	import DetailedRoutesTable from './tables/DetailedRoutesTable.svelte';
	import EditDriversTable from './tables/EditDriversTable.svelte';
	import EditStopsDataTable from './tables/EditStopsDataTable';
	import RouteCards from './tables/RouteCards.svelte';

	let { data }: { data: PageData } = $props();

	// Set page header in layout context
	const pageHeaderContext = getContext<{ set: (header: any) => void }>('pageHeader');

	if (pageHeaderContext) {
		pageHeaderContext.set({
			title: data.map.title,
			breadcrumbs: [{ name: 'Maps', href: '/maps' }]
		});
	}

	let isLoading = $state(false);
	let errorMessage = $state('');
	let isOptimizing = $state(false);
	let isViewMode = $state((data as any).isViewMode ?? false);
	let selectedDepotId = $state<string | undefined>(undefined);
	let focusedStopId = $state<string | null>(null);
	let hiddenDrivers = $state<Driver[]>([]);

	// Update view mode when data changes
	$effect(() => {
		isViewMode = data.isViewMode ?? false;
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
			<MapView
				stops={data.stops}
				routes={data.routes}
				drivers={data.allDrivers}
				bind:hiddenDrivers
				bind:focusedStopId
			/>
		</div>
	{/if}
	<!-- Routes Section (View Mode Only) -->
	{#if isViewMode}
		<!-- New Card-based Routes View -->
		<div class="space-y-6">
			<div>
				<RouteCards
					bind:focusedStopId
					bind:hiddenDrivers
					stops={data.stops}
					assignedDrivers={data.assignedDrivers}
					routes={data.routes}
				/>
			</div>

			<!-- Original Table View -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Route class="h-5 w-5 text-primary" />
						Detailed Routes Table
					</CardTitle>
					<CardDescription>Detailed table view of stops organized by driver</CardDescription>
				</CardHeader>
				<CardContent>
					<DetailedRoutesTable
						bind:focusedStopId
						stops={data.stops}
						assignedDrivers={data.assignedDrivers}
					/>
				</CardContent>
			</Card>
		</div>
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
					onDelete={() => invalidateAll()}
					onZoomToStop={(stopId) => (focusedStopId = stopId)}
				/>
			</CardContent>
		</Card>
	{/if}

	{#if !isViewMode}
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
				<!-- Error Message -->
				{#if errorMessage}
					<div
						class="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
					>
						{errorMessage}
					</div>
				{/if}

				<!-- Drivers Table -->
				<EditDriversTable
					assignedDrivers={data.assignedDrivers}
					allDrivers={data.allDrivers}
					mapId={data.map.id}
					{isLoading}
					onRemoveDriver={removeDriver}
				/>
			</CardContent>
		</Card>
	{/if}

	<!-- Optimization Section -->
	{#if !isViewMode}
		<OptimizationCard
			assignedDrivers={data.assignedDrivers}
			stops={data.stops}
			map={data.map}
			depots={data.depots}
			{isOptimizing}
			onRoutesOptimized={() => invalidateAll()}
			onDepotCreated={() => invalidateAll()}
		/>
	{:else}
		<div class="flex justify-center">
			<Button size="lg" onclick={switchToEditMode} disabled={isLoading} variant="outline">
				Switch to Edit Mode
			</Button>
		</div>
	{/if}
</div>
