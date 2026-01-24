<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import DebugToolbar from '$lib/components/DebugToolbar.svelte';
	import MapView from '$lib/components/map/MapView.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ServiceError } from '$lib/errors';
	import type { Driver } from '$lib/schemas';
	import { mapApi } from '$lib/services/api';
	import { onDestroy } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';
	import MapDetailLayout from './components/MapDetailLayout.svelte';
	import MapHeader from './components/MapHeader.svelte';
	import OptimizationFooter from './components/OptimizationFooter.svelte';
	import OptimizationOverlay from './components/OptimizationOverlay.svelte';
	import SidebarPanel from './components/SidebarPanel.svelte';
	import DriversTab from './components/tabs/DriversTab.svelte';
	import StopsTab from './components/tabs/StopsTab.svelte';

	let { data }: { data: PageData } = $props();

	// Page state
	let isLoading = $state(false);
	let isOptimizing = $state(false);
	let focusedStopId = $state<string | null>(null);
	let hiddenDrivers = $state<Driver[]>([]);

	// Polling state
	let pollInterval: ReturnType<typeof setInterval> | null = null;
	let pollCount = 0;
	const MAX_POLL_COUNT = 150; // 5 minutes at 2 second intervals
	let optimizationStartTime = $state<Date>(new Date());

	// Derive page state
	type PageState = 'normal' | 'optimizing';
	let debugPageStateOverride = $state<PageState | null>(null);
	let pageState: PageState = $derived(
		debugPageStateOverride ?? (isOptimizing ? 'optimizing' : 'normal')
	);

	// Derive selected depot from map's depot_id
	let selectedDepot = $derived.by(() => {
		if (data.map.depot_id) {
			return data.depots.find((d) => d.depot.id === data.map.depot_id) ?? null;
		}
		return null;
	});

	// Check for active optimization job on load
	$effect(() => {
		const activeJob = data.activeJob;
		if (
			activeJob &&
			['pending', 'running', 'completing'].includes(activeJob.status)
		) {
			isOptimizing = true;
			optimizationStartTime = activeJob.created_at
				? new Date(activeJob.created_at)
				: new Date();
			startPolling();
		} else {
			isOptimizing = false;
			stopPolling();
		}
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
		optimizationStartTime = new Date();
		startPolling();
	}

	function handleOptimizationCancelled() {
		stopPolling();
		isOptimizing = false;
	}

	async function handleDepotChange(depotId: string) {
		try {
			await mapApi.update(data.map.id, { depot_id: depotId });
			await invalidateAll();
		} catch (err) {
			const message =
				err instanceof ServiceError ? err.message : 'Failed to update depot';
			toast.error(message);
		}
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
			const message =
				err instanceof ServiceError ? err.message : 'Failed to remove driver';
			toast.error(message);
		} finally {
			isLoading = false;
		}
	}

	async function handleDeleteMap() {
		if (
			!confirm(
				'Are you sure you want to delete this map? This action cannot be undone.'
			)
		) {
			return;
		}

		try {
			await mapApi.delete(data.map.id);
			toast.success('Map deleted');
			window.location.href = '/maps';
		} catch (err) {
			if (err instanceof ServiceError) {
				toast.error(err.message);
			} else {
				toast.error('An unknonwn error occurred');
			}
		}
	}
</script>

<svelte:head>
	<title>Wend | {data.map.title}</title>
</svelte:head>

<div class="flex h-full flex-col">
	<MapHeader
		map={data.map}
		{pageState}
		onDelete={handleDeleteMap}
		onUpdate={() => invalidateAll()}
	/>

	<MapDetailLayout>
		{#snippet children(layoutControls)}
			<div class="relative h-full">
				<MapView
					stops={data.stops}
					routes={data.routes}
					drivers={data.allDrivers}
					assignedDrivers={data.assignedDrivers}
					depot={selectedDepot}
					bind:hiddenDrivers
					bind:focusedStopId
					showToolbar
					toolbarLayoutControls={layoutControls}
					mapId={data.map.id}
					onStopCreated={() => invalidateAll()}
					onStopUpdated={() => invalidateAll()}
					onStopDeleted={() => invalidateAll()}
				/>

				{#if pageState === 'optimizing'}
					<OptimizationOverlay startTime={optimizationStartTime} />
				{/if}
			</div>
		{/snippet}

		{#snippet sidebar()}
			<SidebarPanel
				{pageState}
				stopsCount={data.stops.length}
				driversCount={data.assignedDrivers.length}
			>
				{#snippet stopsTab()}
					<StopsTab
						stops={data.stops}
						drivers={data.assignedDrivers}
						mapId={data.map.id}
						onUpdate={() => invalidateAll()}
						onCreate={() => invalidateAll()}
						onDelete={() => invalidateAll()}
						onZoomToStop={(stopId) => (focusedStopId = stopId)}
					/>
				{/snippet}

				{#snippet driversTab()}
					<DriversTab
						stops={data.stops}
						assignedDrivers={data.assignedDrivers}
						allDrivers={data.allDrivers}
						routes={data.routes}
						mapId={data.map.id}
						bind:hiddenDrivers
						onRemoveDriver={removeDriver}
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
				routes={data.routes}
				plan={data.plan}
				credits={data.credits}
				{pageState}
				onDepotChange={handleDepotChange}
				onOptimize={handleOptimizationStarted}
				onCancel={handleOptimizationCancelled}
			/>
		{/snippet}
	</MapDetailLayout>
</div>

<DebugToolbar title="Map Debug">
	<div class="flex flex-col gap-3">
		<div class="flex flex-col gap-1.5">
			<span class="text-xs font-medium text-muted-foreground">Page State</span>
			<div class="flex gap-1">
				{#each ['normal', 'optimizing'] as state (state)}
					{@const isActive = debugPageStateOverride === state}
					<Button
						variant={isActive ? 'default' : 'outline'}
						size="sm"
						class="h-7 flex-1 text-xs"
						onclick={() => (debugPageStateOverride = state as PageState)}
					>
						{state}
					</Button>
				{/each}
			</div>
			{#if debugPageStateOverride}
				<Button
					variant="ghost"
					size="sm"
					class="h-6 text-xs text-muted-foreground"
					onclick={() => (debugPageStateOverride = null)}
				>
					Reset to auto
				</Button>
			{/if}
		</div>
		<div class="border-t border-border pt-2 text-xs text-muted-foreground">
			<div>Actual: {isOptimizing ? 'optimizing' : 'normal'}</div>
			<div>Override: {debugPageStateOverride ?? 'none'}</div>
		</div>
	</div>
</DebugToolbar>
