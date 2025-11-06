<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Empty from '$lib/components/ui/empty';
	import { Separator } from '$lib/components/ui/separator';
	import type { Route as RouteType } from '$lib/schemas';
	import type { Driver } from '$lib/schemas/driver';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { getIdenticon } from '$lib/utils';

	import {
		Clock,
		Eye,
		EyeClosed,
		MapPin,
		Package,
		Phone,
		Printer,
		Route,
		ScanSearch,
		Share2,
		SquareArrowOutUpRight
	} from 'lucide-svelte';

	interface Props {
		stops: StopWithLocation[];
		assignedDrivers: Driver[];
		routes: RouteType[];
		focusedStopId: string | null;
		hiddenDrivers?: Driver[];
	}

	let {
		stops,
		assignedDrivers,
		routes,
		focusedStopId = $bindable(),
		hiddenDrivers = $bindable()
	}: Props = $props();

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
		const driverRoute = routes.find((e) => e.driver_id == driverStops.at(0)?.stop.driver_id);
		return {
			totalStops: driverStops.length,
			assignedStops: assignedStops.length,
			estimatedTime: Math.floor(Number(driverRoute?.duration) / 60)
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
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon">
						<Route />
					</Empty.Media>
					<Empty.Title>No Routes for this map</Empty.Title>
					<Empty.Description>This should never appear?</Empty.Description>
				</Empty.Header>
				<Empty.Content>
					<Button href="/maps">Back to Maps</Button>
				</Empty.Content>
			</Empty.Root>
		</Card.Content>
	</Card.Root>
{:else}
	<!-- Action Bar -->
	<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
		<div class="flex items-center gap-4">
			<Badge>
				<div class="flex items-center gap-2 text-sm">
					<Route class="h-4 w-4" />
					<span
						>{Array.from(routesByDriver).filter(([id]) => id !== 'unassigned').length} route{Array.from(
							routesByDriver
						).filter(([id]) => id !== 'unassigned').length !== 1
							? 's'
							: ''}</span
					>
				</div>
			</Badge>
			<Badge>
				<div class="foreground flex items-center gap-2 text-sm">
					<MapPin class="h-4 w-4" />
					<span class="">{stops.length} stops</span>
				</div>
			</Badge>
			<Badge>
				<div class="flex items-center gap-2 text-sm">
					<Clock class="h-4 w-4" />
					<span>
						{Math.floor(
							routes.reduce((total, route) => total + Number(route.duration || 0), 0) / 60
						)}
						minutes
					</span>
				</div>
			</Badge>
		</div>
	</div>

	<!-- Routes Display - Horizontal Carousel -->
	<div class="relative overflow-clip">
		<div
			class="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4"
		>
			{#each Array.from(routesByDriver) as [driverId, driverStops]}
				{@const driver = getDriver(driverId)}
				{@const isUnassigned = driverId === 'unassigned'}
				{@const stats = getRouteStats(driverStops)}

				{#if driverStops.length > 0}
					<Card.Root class=" max-w-80 min-w-80 flex-shrink-0 snap-start overflow-hidden">
						<!-- Route Header -->
						<Card.Header class="">
							<div class="flex flex-col gap-3">
								<div class="flex items-center gap-3">
									{#if isUnassigned}
										<div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
											<Package class="h-5 w-5 text-muted-foreground" />
										</div>
										<div class="min-w-0 flex-1">
											<Card.Title class="text-lg">Unassigned Stops</Card.Title>
											<Card.Description>
												{driverStops.length} stop{driverStops.length !== 1 ? 's' : ''} awaiting assignment
											</Card.Description>
										</div>
									{:else if driver}
										<div class="flex size-12 items-center justify-center rounded-full">
											<Avatar.Root class="size-12">
												<Avatar.Image src={getIdenticon(driver)} alt="avatar" />
												<Avatar.Fallback>CN</Avatar.Fallback>
											</Avatar.Root>
										</div>
										<div class="min-w-0 flex-1">
											<Card.Title class="flex items-center gap-2 text-xl">
												{driver.name}
											</Card.Title>
											<Card.Description class="flex flex-col gap-1">
												{#if driver.phone}
													<span class="flex items-center gap-1">
														<Phone class="h-3 w-3" />
														{driver.phone}
													</span>
												{/if}
												<div class="flex gap-3">
													<span class="flex items-center gap-1">
														<Clock class="size-4" />
														{stats.estimatedTime}
													</span>
													<span class="flex items-center gap-1">
														<MapPin class="size-4" />
														{stats.assignedStops}
													</span>
												</div>
											</Card.Description>
										</div>
									{/if}
								</div>
							</div>
						</Card.Header>

						<Card.Content class="flex h-full flex-col justify-between pt-0">
							<!-- Route Steps - Scrollable -->
							<div
								class="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border max-h-96 space-y-0 overflow-y-auto"
							>
								{#each driverStops as { stop, location }, index}
									{@const isFirst = index === 0}
									{@const isLast = index === driverStops.length - 1}

									<div class="flex items-start gap-3">
										<!-- Step Number/Icon -->
										<div class="flex flex-col items-center">
											<div
												class="flex h-6 w-6 items-center justify-center rounded-full border border-primary bg-transparent text-xs font-medium text-primary"
											>
												{stop.delivery_index !== null ? stop.delivery_index : index + 1}
											</div>
											{#if !isLast}
												<div class="mt-1 h-6 w-px bg-border"></div>
											{/if}
										</div>

										<!-- Stop Details -->
										<div class="min-w-0 flex-1 pb-2">
											<div class="flex items-start justify-between gap-2">
												<div class="min-w-0 flex-1">
													<!-- Contact Name -->
													<div class="mb-1 flex items-center gap-2">
														<h4 class="text-sm font-semibold">
															{stop.contact_name || 'No contact name'}
														</h4>
													</div>

													<!-- Address -->
													<div class="mb-1">
														<div class="text-xs text-muted-foreground">
															{location.address_line1}
														</div>
														<div class="text-xs text-muted-foreground">
															{location.city || ''}{location.city && location.region
																? ', '
																: ''}{location.region || ''}
															{location.postal_code || ''}
														</div>
													</div>

													<!-- Contact Info & Notes -->
													<div class="flex flex-col gap-1 text-xs text-muted-foreground">
														{#if stop.contact_phone}
															<div class="flex items-center gap-1">
																<Phone class="h-3 w-3" />
																{stop.contact_phone}
															</div>
														{/if}
														{#if stop.notes}
															<div class="truncate" title={stop.notes}>
																{stop.notes}
															</div>
														{/if}
													</div>
												</div>

												<!-- Action Button -->
												<Button
													onclick={() => (focusedStopId = stop.id)}
													size="icon-sm"
													variant="ghost"
													class=" shrink-0"
												>
													<ScanSearch class="" />
													<span class="sr-only">View stop on map</span>
												</Button>
											</div>
										</div>
									</div>
								{/each}
							</div>

							<div class="flex flex-col gap-2 text-xs text-muted-foreground">
								<Separator class="mb-2" />
								<div class="flex w-full gap-2">
									<DropdownMenu.Root>
										<DropdownMenu.Trigger
											class="{buttonVariants({ variant: 'outline', size: 'sm' })} flex-1"
											disabled={true}
										>
											<Share2 /> Share
										</DropdownMenu.Trigger>
										<DropdownMenu.Content>
											<DropdownMenu.Group>
												<DropdownMenu.Label>My Account</DropdownMenu.Label>
												<DropdownMenu.Separator />
												<DropdownMenu.Item>Profile</DropdownMenu.Item>
												<DropdownMenu.Item>Billing</DropdownMenu.Item>
												<DropdownMenu.Item>Team</DropdownMenu.Item>
												<DropdownMenu.Item>Subscription</DropdownMenu.Item>
											</DropdownMenu.Group>
										</DropdownMenu.Content>
									</DropdownMenu.Root>
									{#if !isUnassigned && driver}
										{#if hiddenDrivers?.find((e) => e.id == driver.id)}
											<Button
												onclick={() => {
													if (hiddenDrivers) {
														hiddenDrivers = hiddenDrivers.filter((d) => d.id !== driver.id);
													}
												}}
												variant="outline"
												size="sm"
											>
												<EyeClosed />
											</Button>
										{:else}
											<Button
												onclick={() => {
													if (hiddenDrivers && driver) {
														hiddenDrivers = [...hiddenDrivers, driver];
													}
												}}
												variant="outline"
												size="sm"
											>
												<Eye />
											</Button>
										{/if}
									{/if}
								</div>
								<div class="grid grid-cols-2">
									<Button
										class="flex gap-2"
										size="sm"
										variant="link"
										href={`/routes/${
											routes.find((e) => {
												return e.driver_id == driver?.id;
											})?.id
										}`}
									>
										<SquareArrowOutUpRight class="size-4" />
										Route Page
									</Button>
									<Button class="flex gap-2" disabled size="sm" variant="ghost">
										<Printer class="size-4" />
										Print
									</Button>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
			{/each}
		</div>
	</div>
{/if}
