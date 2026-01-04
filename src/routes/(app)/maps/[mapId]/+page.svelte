<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import MapView from '$lib/components/MapView.svelte';
	import type { Driver } from '$lib/schemas';
	import { ApiError, mapApi } from '$lib/services/api';
	import { onDestroy } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';
	import MapDetailLayout from './components/MapDetailLayout.svelte';
	import MapHeader from './components/MapHeader.svelte';
	import OptimizationFooter from './components/OptimizationFooter.svelte';
	import SidebarPanel from './components/SidebarPanel.svelte';
	import DriversTab from './components/tabs/DriversTab.svelte';
	import RoutesTab from './components/tabs/RoutesTab.svelte';
	import StopsTab from './components/tabs/StopsTab.svelte';

	let { data }: { data: PageData } = $props();

	// Page state
	let isLoading = $state(false);
	let isOptimizing = $state(false);
	let isViewMode = $state(data.isViewMode ?? false);
	let focusedStopId = $state<string | null>(null);
	let hiddenDrivers = $state<Driver[]>([]);
	let selectedDepotId = $state<string | undefined>(undefined);

	// Polling state
	let pollInterval: ReturnType<typeof setInterval> | null = null;
	let pollCount = 0;
	const MAX_POLL_COUNT = 150; // 5 minutes at 2 second intervals

	// Derive page state
	type PageState = 'viewing' | 'optimizing' | 'editing';
	let pageState: PageState = $derived(
		isViewMode ? 'viewing' : isOptimizing ? 'optimizing' : 'editing'
	);

	// Derive selected depot for map display
	let selectedDepot = $derived.by(() => {
		if (isViewMode && data.routes && data.routes.length > 0) {
			const depotId = data.routes[0].depot_id;
			return data.depots.find((d) => d.depot.id === depotId) ?? null;
		}
		return data.depots.find((d) => d.depot.id === selectedDepotId) ?? null;
	});

	// Check for active optimization job on load
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
			toast.error('Optimization timed out. Please try again.');
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
				toast.error(job.error_message || 'Optimization failed');
				await invalidateAll();
			} else if (job.status === 'cancelled') {
				stopPolling();
				isOptimizing = false;
				await invalidateAll();
			}
		} catch (err) {
			console.error('Error polling optimization status:', err);
		}
	}

	function handleOptimizationStarted() {
		isOptimizing = true;
		startPolling();
	}

	function handleOptimizationCancelled() {
		stopPolling();
		isOptimizing = false;
	}

	onDestroy(() => {
		stopPolling();
	});

	async function removeDriver(driverId: string) {
		if (isLoading) return;

		// Find the route for this driver
		const route = data.routes.find((r) => r.driver_id === driverId);
		if (route) {
			toast.error('Could not find route for driver');
			return;
		}

		if (!confirm('Are you sure you want to remove this driver from the map?')) {
			return;
		}

		isLoading = true;

		try {
			await mapApi.removeDriver(data.map.id, driverId);
			await invalidateAll();
			toast.success('Driver removed');
		} catch (err) {
			console.log(err);
			const message = err instanceof ApiError ? err.message : 'Failed to remove driver';
			toast.error(message);
		} finally {
			isLoading = false;
		}
	}

	async function switchToEditMode() {
		if (isLoading) return;

		if (
			!confirm(
				'Switching to edit mode will remove all optimized route data. Are you sure you want to continue?'
			)
		) {
			return;
		}

		isLoading = true;

		try {
			await mapApi.resetOptimization(data.map.id);
			isViewMode = false;
			await invalidateAll();
		} catch (err) {
			toast.error('Failed to switch to edit mode');
		} finally {
			isLoading = false;
		}
	}

	async function handleDeleteMap() {
		if (!confirm('Are you sure you want to delete this map? This action cannot be undone.')) {
			return;
		}

		try {
			await mapApi.delete(data.map.id);
			toast.success('Map deleted');
			window.location.href = '/maps';
		} catch (err) {
			toast.error('Failed to delete map');
		}
	}
</script>

<svelte:head>
	<title>{data.map.title} - Routing Project</title>
</svelte:head>

<div class="flex h-full flex-col">
	<MapHeader
		title={data.map.title}
		mapId={data.map.id}
		{pageState}
		onDelete={handleDeleteMap}
		onUpdate={() => invalidateAll()}
	/>

	<MapDetailLayout>
		{#snippet children()}
			<div class="relative h-full">
				<MapView
					stops={data.stops}
					routes={data.routes}
					drivers={data.allDrivers}
					depot={selectedDepot}
					bind:hiddenDrivers
					bind:focusedStopId
				/>

				<!-- Optimization overlay -->
				{#if pageState === 'optimizing'}
					<div
						class="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
					>
						<div class="flex flex-col items-center gap-3">
							<div
								class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
							></div>
							<p class="text-sm text-muted-foreground">Optimizing routes...</p>
						</div>
					</div>
				{/if}
			</div>
		{/snippet}

		{#snippet sidebar()}
			<SidebarPanel
				{pageState}
				stopsCount={data.stops.length}
				driversCount={data.assignedDrivers.length}
				routesCount={data.routes.length}
			>
				{#snippet stopsTab()}
					<StopsTab
						stops={data.stops}
						mapId={data.map.id}
						readonly={pageState === 'viewing'}
						onUpdate={() => invalidateAll()}
						onCreate={() => invalidateAll()}
						onDelete={() => invalidateAll()}
						onZoomToStop={(stopId) => (focusedStopId = stopId)}
					/>
				{/snippet}

				{#snippet driversTab()}
					<DriversTab
						assignedDrivers={data.assignedDrivers}
						allDrivers={data.allDrivers}
						mapId={data.map.id}
						{isLoading}
						onRemoveDriver={removeDriver}
					/>
				{/snippet}

				{#snippet routesTab()}
					<RoutesTab
						stops={data.stops}
						assignedDrivers={data.assignedDrivers}
						routes={data.routes}
						bind:hiddenDrivers
						onZoomToStop={(stopId) => (focusedStopId = stopId)}
					/>
				{/snippet}
			</SidebarPanel>
		{/snippet}

		{#snippet footer()}
			<OptimizationFooter
				map={data.map}
				stops={data.stops}
				depots={data.depots}
				assignedDrivers={data.assignedDrivers}
				{pageState}
				bind:selectedDepotId
				onOptimize={handleOptimizationStarted}
				onCancel={handleOptimizationCancelled}
				onSwitchToEdit={switchToEditMode}
			/>
		{/snippet}
	</MapDetailLayout>
</div>
