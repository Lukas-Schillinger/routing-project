<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { INVALIDATION_KEYS } from '$lib/invalidation-keys';
	import DebugToolbar from '$lib/components/DebugToolbar.svelte';
	import MapView from '$lib/components/map/MapView.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ServiceError } from '$lib/errors';
	import type { Driver } from '$lib/schemas';
	import { mapApi } from '$lib/services/api';
	import { onDestroy, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { useSearchParams } from 'runed/kit';
	import { z } from 'zod';
	import type { PageData } from './$types';
	import MapDetailLayout from './components/MapDetailLayout.svelte';
	import MapHeader from './components/MapHeader.svelte';
	import OptimizationFooter from './components/OptimizationFooter.svelte';
	import OptimizationOverlay from './components/OptimizationOverlay.svelte';
	import SidebarPanel from './components/SidebarPanel.svelte';
	import DriversTab from './components/tabs/DriversTab.svelte';
	import StopsTab from './components/tabs/StopsTab.svelte';
	import { createOptimizationPoller } from './optimization-poller.svelte';

	let { data }: { data: PageData } = $props();

	// URL-persisted UI state
	const paramsSchema = z.object({
		tab: z.enum(['stops', 'drivers']).catch('stops'),
		sort: z.string().catch('updated_at'),
		dir: z.enum(['asc', 'desc']).catch('desc'),
		expanded: z.string().array().catch([]),
		pane: z.coerce.number().catch(50)
	});

	const params = useSearchParams(paramsSchema, {
		pushHistory: false,
		noScroll: true
	});

	// Page state
	let isLoading = $state(false);
	let focusedStopId = $state<string | null>(null);
	let hiddenDrivers = $state<Driver[]>([]);

	// Optimization polling
	const poller = createOptimizationPoller(
		untrack(() => data.map.id),
		untrack(() => data.stops.length),
		{
			onComplete: () => invalidate(INVALIDATION_KEYS.MAP_DATA),
			onCancelled: () => invalidate(INVALIDATION_KEYS.MAP_DATA)
		}
	);

	// Derive page state
	type PageState = 'normal' | 'optimizing';
	let debugPageStateOverride = $state<PageState | null>(null);
	let pageState: PageState = $derived(
		debugPageStateOverride ?? (poller.isOptimizing ? 'optimizing' : 'normal')
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
			poller.start(
				activeJob.created_at ? new Date(activeJob.created_at) : undefined
			);
		} else {
			poller.stop();
		}
	});

	async function handleDepotChange(depotId: string) {
		try {
			await mapApi.update(data.map.id, { depot_id: depotId });
			await invalidate(INVALIDATION_KEYS.MAP_DATA);
		} catch (err) {
			const message =
				err instanceof ServiceError ? err.message : 'Failed to update depot';
			toast.error(message);
		}
	}

	onDestroy(() => {
		poller.destroy();
	});

	async function removeDriver(driverId: string) {
		if (isLoading) return;
		isLoading = true;

		try {
			await mapApi.removeDriver(data.map.id, driverId);
			await invalidate(INVALIDATION_KEYS.MAP_DATA);
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
		await mapApi.delete(data.map.id);
		toast.success('Map deleted');
		window.location.href = '/maps';
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
		onUpdate={() => invalidate(INVALIDATION_KEYS.MAP_DATA)}
	/>

	<MapDetailLayout bind:paneSize={params.pane}>
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
					onStopCreated={() => invalidate(INVALIDATION_KEYS.MAP_DATA)}
					onStopUpdated={() => invalidate(INVALIDATION_KEYS.MAP_DATA)}
					onStopDeleted={() => invalidate(INVALIDATION_KEYS.MAP_DATA)}
				/>

				{#if pageState === 'optimizing'}
					<OptimizationOverlay startTime={poller.startTime} />
				{/if}
			</div>
		{/snippet}

		{#snippet sidebar()}
			<SidebarPanel
				{pageState}
				bind:activeTab={params.tab}
				stopsCount={data.stops.length}
				driversCount={data.assignedDrivers.length}
			>
				{#snippet stopsTab()}
					<StopsTab
						stops={data.stops}
						drivers={data.assignedDrivers}
						mapId={data.map.id}
						bind:sortColumn={params.sort}
						bind:sortDirection={params.dir}
						onUpdate={() => invalidate(INVALIDATION_KEYS.MAP_DATA)}
						onCreate={() => invalidate(INVALIDATION_KEYS.MAP_DATA)}
						onDelete={() => invalidate(INVALIDATION_KEYS.MAP_DATA)}
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
						bind:expandedDrivers={params.expanded}
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
				planSlug={data.planSlug}
				monthlyCredits={data.monthlyCredits}
				credits={data.credits}
				{pageState}
				onDepotChange={handleDepotChange}
				pollerError={poller.error}
				onOptimize={() => poller.start()}
				onCancel={() => poller.stop()}
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
			<div>Actual: {poller.isOptimizing ? 'optimizing' : 'normal'}</div>
			<div>Override: {debugPageStateOverride ?? 'none'}</div>
		</div>
	</div>
</DebugToolbar>
