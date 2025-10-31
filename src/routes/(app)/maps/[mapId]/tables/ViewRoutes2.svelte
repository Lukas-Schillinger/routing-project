<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import type { Driver } from '$lib/schemas/driver';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import {
		ChevronRight,
		Clock,
		Download,
		Eye,
		MapPin,
		Navigation,
		Package,
		Phone,
		Printer,
		Route,
		Share2
	} from 'lucide-svelte';

	interface Props {
		stops: StopWithLocation[];
		assignedDrivers: Driver[];
		focusedStopId: string | null;
	}

	let { stops, assignedDrivers, focusedStopId = $bindable() }: Props = $props();

	// Group stops by driver
	const routesByDriver = $derived.by(() => {
		const routes = new Map<string, StopWithLocation[]>();

		// Initialize routes for each assigned driver
		assignedDrivers.forEach((driver) => {
			routes.set(driver.id, []);
		});

		// Add unassigned route
		routes.set('unassigned', []);

		// Group stops by driver
		stops.forEach((stop) => {
			if (stop.stop.driver_id) {
				const driverStops = routes.get(stop.stop.driver_id) || [];
				driverStops.push(stop);
				routes.set(stop.stop.driver_id, driverStops);
			} else {
				const unassignedStops = routes.get('unassigned') || [];
				unassignedStops.push(stop);
				routes.set('unassigned', unassignedStops);
			}
		});

		// Sort stops by delivery_index within each route
		routes.forEach((driverStops, driverId) => {
			driverStops.sort((a, b) => {
				const aIndex = a.stop.delivery_index ?? Number.MAX_SAFE_INTEGER;
				const bIndex = b.stop.delivery_index ?? Number.MAX_SAFE_INTEGER;
				return aIndex - bIndex;
			});
		});

		return routes;
	});

	// Get driver by ID
	function getDriver(driverId: string): Driver | undefined {
		return assignedDrivers.find((d) => d.id === driverId);
	}

	// Calculate route statistics
	function getRouteStats(driverStops: StopWithLocation[]) {
		const assignedStops = driverStops.filter((s) => s.stop.delivery_index !== null);
		const estimatedTime = assignedStops.length * 15; // 15 minutes per stop estimate
		return {
			totalStops: driverStops.length,
			assignedStops: assignedStops.length,
			estimatedTime: Math.round(estimatedTime)
		};
	}

	// Placeholder functions for sharing and printing
	function handleShare() {
		// Placeholder for sharing functionality
		alert(
			'Share functionality coming soon! This will allow you to share routes via email, SMS, or generate shareable links.'
		);
	}

	function handlePrint() {
		// Placeholder for print functionality
		alert(
			'Print functionality coming soon! This will generate printer-friendly route sheets for drivers.'
		);
	}

	function handleExport() {
		// Placeholder for export functionality
		alert('Export functionality coming soon! This will export routes as PDF, Excel, or CSV files.');
	}
</script>

{#if stops.length === 0}
	<Card.Root>
		<Card.Content class="flex flex-col items-center justify-center py-16">
			<MapPin class="mb-4 h-16 w-16 text-muted-foreground" />
			<h3 class="headline-small mb-2">No Stops Yet</h3>
			<p class="body-medium text-center text-muted-foreground">
				Add stops to this map to start planning routes.
			</p>
		</Card.Content>
	</Card.Root>
{:else}
	<!-- Action Bar -->
	<div class="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4">
		<div class="flex items-center gap-4">
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<Route class="h-4 w-4" />
				<span
					>{Array.from(routesByDriver).filter(([id]) => id !== 'unassigned').length} route{Array.from(
						routesByDriver
					).filter(([id]) => id !== 'unassigned').length !== 1
						? 's'
						: ''}</span
				>
			</div>
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<MapPin class="h-4 w-4" />
				<span>{stops.length} total stops</span>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" onclick={handleShare}>
				<Share2 class="mr-2 h-4 w-4" />
				Share
			</Button>
			<Button variant="outline" size="sm" onclick={handleExport}>
				<Download class="mr-2 h-4 w-4" />
				Export
			</Button>
			<Button variant="outline" size="sm" onclick={handlePrint}>
				<Printer class="mr-2 h-4 w-4" />
				Print
			</Button>
		</div>
	</div>

	<!-- Routes Display -->
	<div class="space-y-6">
		{#each Array.from(routesByDriver) as [driverId, driverStops]}
			{@const driver = getDriver(driverId)}
			{@const isUnassigned = driverId === 'unassigned'}
			{@const stats = getRouteStats(driverStops)}

			{#if driverStops.length > 0}
				<Card.Root class="overflow-hidden">
					<!-- Route Header -->
					<Card.Header class="pb-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								{#if isUnassigned}
									<div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
										<Package class="h-5 w-5 text-muted-foreground" />
									</div>
									<div>
										<Card.Title class="text-lg">Unassigned Stops</Card.Title>
										<Card.Description>
											{driverStops.length} stop{driverStops.length !== 1 ? 's' : ''} awaiting assignment
										</Card.Description>
									</div>
								{:else if driver}
									<div class="flex h-10 w-10 items-center justify-center rounded-full"></div>
									<div>
										<Card.Title class="flex items-center gap-2 text-lg">
											{driver.name}
											{#if driver.temporary}
												<Badge variant="secondary" class="text-xs">Temporary</Badge>
											{/if}
										</Card.Title>
										<Card.Description class="flex items-center gap-4">
											{#if driver.phone}
												<span class="flex items-center gap-1">
													<Phone class="h-3 w-3" />
													{driver.phone}
												</span>
											{/if}
											<span class="flex items-center gap-1">
												<Clock class="h-3 w-3" />
												~{stats.estimatedTime} min route
											</span>
										</Card.Description>
									</div>
								{/if}
							</div>

							<!-- Route Stats -->
							<div class="flex items-center gap-4 text-sm">
								<div class="text-center">
									<div class="text-lg font-semibold">{stats.totalStops}</div>
									<div class="text-muted-foreground">stops</div>
								</div>
								{#if !isUnassigned}
									<div class="text-center">
										<div class="text-lg font-semibold">{stats.estimatedTime}m</div>
										<div class="text-muted-foreground">est. time</div>
									</div>
								{/if}
							</div>
						</div>
					</Card.Header>

					<Card.Content class="pt-0">
						<!-- Route Steps -->
						<div class="space-y-0">
							{#each driverStops as { stop, location }, index}
								{@const isFirst = index === 0}
								{@const isLast = index === driverStops.length - 1}

								<div class="flex items-start gap-4">
									<!-- Step Number/Icon -->
									<div class="flex flex-col items-center">
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground"
										>
											{stop.delivery_index !== null ? stop.delivery_index : index + 1}
										</div>
										{#if !isLast}
											<div class="mt-2 h-8 w-px bg-border"></div>
										{/if}
									</div>

									<!-- Stop Details -->
									<div class="min-w-0 flex-1 pb-2">
										<div class="flex items-start justify-between gap-4">
											<div class="min-w-0 flex-1">
												<!-- Contact Name -->
												<div class="mb-1 flex items-center gap-2">
													<h4 class="text-base font-semibold">
														{stop.contact_name || 'No contact name'}
													</h4>
													{#if isFirst && !isUnassigned}
														<Badge variant="outline" class="text-xs">First stop</Badge>
													{:else if isLast && !isUnassigned}
														<Badge variant="outline" class="text-xs">Last stop</Badge>
													{/if}
												</div>

												<!-- Address -->
												<div class="">
													<div class="text-sm font-medium text-muted-foreground">
														{location.address_line1}, {location.city || ''}{location.city &&
														location.region
															? ', '
															: ''}{location.region || ''}
														{location.postal_code || ''}
													</div>
												</div>

												<!-- Contact Info & Notes -->
												<div
													class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground"
												>
													{#if stop.contact_phone}
														<div class="flex items-center gap-1">
															<Phone class="h-3 w-3" />
															{stop.contact_phone}
														</div>
													{/if}
													{#if stop.notes}
														<div class="flex max-w-xs items-center gap-1">
															<span class="truncate" title={stop.notes}>
																{stop.notes}
															</span>
														</div>
													{/if}
												</div>
											</div>

											<!-- Action Button -->
											<Button
												onclick={() => (focusedStopId = stop.id)}
												size="sm"
												variant="ghost"
												class="shrink-0"
											>
												<Eye class="h-4 w-4" />
												<span class="sr-only">View stop on map</span>
											</Button>
										</div>
									</div>
								</div>
							{/each}
						</div>

						{#if !isUnassigned && driverStops.length > 1}
							<Separator class="my-4" />
							<div class="flex items-center justify-between text-sm text-muted-foreground">
								<div class="flex items-center gap-2">
									<Navigation class="h-4 w-4" />
									<span>Route optimized for efficiency</span>
								</div>
								<div class="flex items-center gap-1">
									<span>Total estimated time: {stats.estimatedTime} minutes</span>
									<ChevronRight class="h-4 w-4" />
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			{/if}
		{/each}
	</div>
{/if}
