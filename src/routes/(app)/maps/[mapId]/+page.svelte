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
	import { getContext, onDestroy } from 'svelte';
	import type { PageData } from './$types';
	import OptimizationCard from './OptimizationCard/';
	import OptimizationLoadingCard from './OptimizationLoading/OptimizationLoadingCard.svelte';
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
	let isViewMode = $state(data.isViewMode ?? false);
	let focusedStopId = $state<string | null>(null);
	let hiddenDrivers = $state<Driver[]>([]);
	let pollInterval: ReturnType<typeof setInterval> | null = null;
	let pollCount = 0;
	const MAX_POLL_COUNT = 150; // 5 minutes at 2 second intervals

	// Derive page state from isViewMode and isOptimizing
	type PageState = 'viewing' | 'optimizing' | 'editing';
	let pageState: PageState = $derived(
		isViewMode ? 'viewing' : isOptimizing ? 'optimizing' : 'editing'
	);

	// Check for active optimization job on load and when data changes
	$effect(() => {
		const activeJob = data.activeJob;
		if (activeJob && ['pending', 'running', 'completing'].includes(activeJob.status)) {
			isOptimizing = true;
			startPolling();
		} else {
			isOptimizing = false;
			stopPolling();
		}
	});

	// Update view mode when data changes
	$effect(() => {
		isViewMode = data.isViewMode ?? false;
	});

	function startPolling() {
		if (pollInterval) return;
		pollCount = 0;
		pollInterval = setInterval(pollOptimizationStatus, 2000);
	}

	function stopPolling() {
		if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
		pollCount = 0;
	}

	async function pollOptimizationStatus() {
		pollCount++;

		if (pollCount >= MAX_POLL_COUNT) {
			stopPolling();
			isOptimizing = false;
			errorMessage = 'Optimization timed out. Please try again.';
			return;
		}

		try {
			const { job } = await mapApi.getOptimizationStatus(data.map.id);

			if (!job || job.status === 'completed') {
				stopPolling();
				isOptimizing = false;
				await invalidateAll();
			} else if (job.status === 'failed') {
				stopPolling();
				isOptimizing = false;
				errorMessage = job.error_message || 'Optimization failed';
				await invalidateAll();
			}
		} catch (err) {
			console.error('Error polling optimization status:', err);
		}
	}

	onDestroy(() => {
		stopPolling();
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
	<!-- Map (shown in all states) -->
	<div class="h-[500px]">
		<MapView
			stops={data.stops}
			routes={data.routes}
			drivers={data.allDrivers}
			bind:hiddenDrivers
			bind:focusedStopId
		/>
	</div>

	<!-- Page State: Viewing -->
	{#if pageState === 'viewing'}
		<div class="space-y-6">
			<RouteCards
				bind:focusedStopId
				bind:hiddenDrivers
				stops={data.stops}
				assignedDrivers={data.assignedDrivers}
				routes={data.routes}
			/>

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

			<div class="flex justify-center">
				<Button size="lg" onclick={switchToEditMode} disabled={isLoading} variant="outline">
					Switch to Edit Mode
				</Button>
			</div>
		</div>

		<!-- Page State: Optimizing -->
	{:else if pageState === 'optimizing'}
		<OptimizationLoadingCard />

		<!-- Page State: Editing -->
	{:else}
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

		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Truck class="h-5 w-5 text-primary" />
					Drivers
				</CardTitle>
				<CardDescription>Assign drivers to this map for route optimization</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if errorMessage}
					<div
						class="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
					>
						{errorMessage}
					</div>
				{/if}

				<EditDriversTable
					assignedDrivers={data.assignedDrivers}
					allDrivers={data.allDrivers}
					mapId={data.map.id}
					{isLoading}
					onRemoveDriver={removeDriver}
				/>
			</CardContent>
		</Card>

		<OptimizationCard
			assignedDrivers={data.assignedDrivers}
			stops={data.stops}
			map={data.map}
			depots={data.depots}
			bind:isOptimizing
			onRoutesOptimized={() => invalidateAll()}
			onDepotCreated={() => invalidateAll()}
		/>
	{/if}
</div>
