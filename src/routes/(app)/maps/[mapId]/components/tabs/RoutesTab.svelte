<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import type { Route as RouteType } from '$lib/schemas';
	import type { Driver } from '$lib/schemas/driver';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { addressDisplay, getIdenticon } from '$lib/utils';
	import {
		ChevronDown,
		Clock,
		ExternalLink,
		Eye,
		EyeOff,
		MapPin,
		Printer,
		Route
	} from 'lucide-svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { slide } from 'svelte/transition';

	let {
		stops,
		assignedDrivers,
		routes,
		hiddenDrivers = $bindable([]),
		onZoomToStop
	}: {
		stops: StopWithLocation[];
		assignedDrivers: Driver[];
		routes: RouteType[];
		hiddenDrivers?: Driver[];
		onZoomToStop: (stopId: string) => void;
	} = $props();

	// Track which routes are expanded
	let expandedRoutes = $state<Set<string>>(new Set());

	// Group stops by driver
	const routesByDriver = $derived.by(() => {
		const grouped = new SvelteMap<string, StopWithLocation[]>();

		assignedDrivers.forEach((driver) => {
			grouped.set(driver.id, []);
		});

		grouped.set('unassigned', []);

		stops.forEach((stop) => {
			if (stop.stop.driver_id) {
				const driverStops = grouped.get(stop.stop.driver_id) || [];
				driverStops.push(stop);
				grouped.set(stop.stop.driver_id, driverStops);
			} else {
				const unassignedStops = grouped.get('unassigned') || [];
				unassignedStops.push(stop);
				grouped.set('unassigned', unassignedStops);
			}
		});

		// Sort stops by delivery_index
		grouped.forEach((driverStops) => {
			driverStops.sort((a, b) => {
				const aIndex = a.stop.delivery_index ?? Number.MAX_SAFE_INTEGER;
				const bIndex = b.stop.delivery_index ?? Number.MAX_SAFE_INTEGER;
				return aIndex - bIndex;
			});
		});

		return grouped;
	});

	function getRouteStats(driverStops: StopWithLocation[], driverId: string) {
		const driverRoute = routes.find((r) => r.driver_id === driverId);
		const durationMinutes = driverRoute?.duration
			? Math.floor(Number(driverRoute.duration) / 60)
			: 0;
		const hours = Math.floor(durationMinutes / 60);
		const minutes = durationMinutes % 60;

		return {
			totalStops: driverStops.length,
			duration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
		};
	}

	function toggleExpanded(driverId: string) {
		if (expandedRoutes.has(driverId)) {
			expandedRoutes.delete(driverId);
		} else {
			expandedRoutes.add(driverId);
		}
		expandedRoutes = new SvelteSet(expandedRoutes);
	}

	function toggleDriverVisibility(driver: Driver) {
		const index = hiddenDrivers.findIndex((d) => d.id === driver.id);
		if (index >= 0) {
			hiddenDrivers = hiddenDrivers.filter((d) => d.id !== driver.id);
		} else {
			hiddenDrivers = [...hiddenDrivers, driver];
		}
	}

	function isDriverHidden(driverId: string): boolean {
		return hiddenDrivers.some((d) => d.id === driverId);
	}

	function getRouteForDriver(driverId: string): RouteType | undefined {
		return routes.find((r) => r.driver_id === driverId);
	}

	// Calculate totals
	const totals = $derived.by(() => {
		const totalStops = stops.length;
		const totalDuration = routes.reduce(
			(acc, r) => acc + (Number(r.duration) || 0),
			0
		);
		const durationMinutes = Math.floor(totalDuration / 60);
		const hours = Math.floor(durationMinutes / 60);
		const minutes = durationMinutes % 60;

		return {
			stops: totalStops,
			routes: assignedDrivers.length,
			duration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
		};
	});
</script>

<div class="flex h-full flex-col">
	<!-- Summary Header -->
	<div class="flex items-center justify-between border-b border-border/50 py-3">
		<div class="flex items-center gap-4 text-sm">
			<span class="flex items-center gap-1.5 text-muted-foreground">
				<Route class="h-3.5 w-3.5" />
				{totals.routes} routes
			</span>
			<span class="flex items-center gap-1.5 text-muted-foreground">
				<MapPin class="h-3.5 w-3.5" />
				{totals.stops} stops
			</span>
			<span class="flex items-center gap-1.5 text-muted-foreground">
				<Clock class="h-3.5 w-3.5" />
				{totals.duration}
			</span>
		</div>
	</div>

	<!-- Routes List -->
	<div class="flex-1 space-y-2 overflow-auto py-4">
		{#each assignedDrivers as driver (driver.id)}
			{@const driverStops = routesByDriver.get(driver.id) || []}
			{@const stats = getRouteStats(driverStops, driver.id)}
			{@const route = getRouteForDriver(driver.id)}
			{@const isHidden = isDriverHidden(driver.id)}
			{@const isExpanded = expandedRoutes.has(driver.id)}

			<div
				class="rounded-lg border border-border/50 transition-colors"
				class:opacity-50={isHidden}
			>
				<!-- Route Header -->
				<button
					type="button"
					class="flex w-full items-center gap-3 p-3 text-left hover:bg-accent/30"
					onclick={() => toggleExpanded(driver.id)}
				>
					<Avatar.Root class="h-9 w-9 border border-border/50">
						<Avatar.Image src={getIdenticon(driver)} alt={driver.name} />
						<Avatar.Fallback class="text-xs">
							{driver.name.slice(0, 2).toUpperCase()}
						</Avatar.Fallback>
					</Avatar.Root>

					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{driver.name}</p>
						<div class="flex items-center gap-3 text-xs text-muted-foreground">
							<span>{stats.totalStops} stops</span>
							{#if stats.duration !== '0m'}
								<span>{stats.duration}</span>
							{/if}
						</div>
					</div>

					<div class="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							class="h-7 w-7"
							onclick={(e: MouseEvent) => {
								e.stopPropagation();
								toggleDriverVisibility(driver);
							}}
						>
							{#if isHidden}
								<EyeOff class="h-3.5 w-3.5" />
							{:else}
								<Eye class="h-3.5 w-3.5" />
							{/if}
						</Button>

						{#if route}
							<Button
								variant="ghost"
								size="icon"
								class="h-7 w-7"
								href="/routes/{route.id}"
								onclick={(e: MouseEvent) => e.stopPropagation()}
							>
								<ExternalLink class="h-3.5 w-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="h-7 w-7"
								href="/routes/{route.id}/printable"
								target="_blank"
								onclick={(e: MouseEvent) => e.stopPropagation()}
							>
								<Printer class="h-3.5 w-3.5" />
							</Button>
						{/if}

						<ChevronDown
							class="h-4 w-4 transition-transform duration-200 {isExpanded
								? 'rotate-180'
								: ''}"
						/>
					</div>
				</button>

				<!-- Stops List (Collapsible) -->
				{#if isExpanded}
					<div
						class="border-t border-border/50 px-3 py-2"
						transition:slide={{ duration: 200 }}
					>
						{#each driverStops as stop, index (stop.stop.id)}
							{@const addr = addressDisplay(stop.location)}
							<button
								type="button"
								class="flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-accent/50"
								onclick={() => onZoomToStop(stop.stop.id)}
							>
								<div
									class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
								>
									{index + 1}
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm">
										{stop.stop.contact_name || addr.topLine}
									</p>
									<p class="truncate text-xs text-muted-foreground">
										{#if stop.stop.contact_name}
											{addr.topLine}
										{:else}
											{addr.bottomLine}
										{/if}
									</p>
								</div>
							</button>
						{/each}

						{#if driverStops.length === 0}
							<p class="py-4 text-center text-sm text-muted-foreground">
								No stops assigned
							</p>
						{/if}
					</div>
				{/if}
			</div>
		{/each}

		<!-- Unassigned Stops -->
		{#if (routesByDriver.get('unassigned') ?? []).length > 0}
			{@const unassignedStops = routesByDriver.get('unassigned') ?? []}
			<div class="rounded-lg border border-dashed border-border/50 p-3">
				<p class="mb-2 text-sm font-medium text-muted-foreground">
					Unassigned ({unassignedStops.length})
				</p>
				<div class="space-y-1">
					{#each unassignedStops as stop (stop.stop.id)}
						{@const addr = addressDisplay(stop.location)}
						<button
							type="button"
							class="flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-accent/50"
							onclick={() => onZoomToStop(stop.stop.id)}
						>
							<MapPin class="h-4 w-4 shrink-0 text-muted-foreground" />
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm">
									{stop.stop.contact_name || addr.topLine}
								</p>
								<p class="truncate text-xs text-muted-foreground">
									{#if stop.stop.contact_name}
										{addr.topLine}
									{:else}
										{addr.bottomLine}
									{/if}
								</p>
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
