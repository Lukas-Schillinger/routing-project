<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as Table from '$lib/components/ui/table';
	import type { Driver } from '$lib/schemas/driver';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { Eye, MapPin, Package, Phone } from 'lucide-svelte';
	import { slide } from 'svelte/transition';

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
	<div class="space-y-6">
		{#each Array.from(routesByDriver) as [driverId, driverStops]}
			{@const driver = getDriver(driverId)}
			{@const isUnassigned = driverId === 'unassigned'}
			{#if driverStops.length > 0}
				<div class="mb-2 flex items-center justify-between overflow-auto">
					<div class="flex w-full items-center gap-3">
						{#if isUnassigned}
							<Package class="h-5 w-5 text-muted-foreground" />
							<div>
								<Card.Title>Unassigned Stops</Card.Title>
								<Card.Description>
									{driverStops.length} stop{driverStops.length !== 1 ? 's' : ''}
									not assigned to any driver
								</Card.Description>
							</div>
						{:else if driver}
							<Collapsible.Root open={true} class="w-full">
								<div class="flex items-center gap-2">
									<Collapsible.Trigger class={buttonVariants({ variant: 'outline', size: 'sm' })}>
										<ChevronDown />
									</Collapsible.Trigger>
									<Card.Title class="flex items-center gap-2">
										{driver.name}
										{#if driver.temporary}
											<Badge variant="secondary" class="text-xs">Temporary</Badge>
										{/if}
									</Card.Title>
									<Card.Description class="items-center">
										{#if driver.phone}
											<span class="flex items-center gap-1">
												<Phone class="h-3 w-3" />
												{driver.phone}
											</span>
										{/if}
										<span class="flex items-center gap-1">
											<MapPin class="h-3 w-3" />
											{driverStops.length} stop{driverStops.length !== 1 ? 's' : ''}
										</span>
									</Card.Description>
								</div>
								<div>
									<Collapsible.Content forceMount class="w-full overflow-scroll">
										{#snippet child({ props, open })}
											{#if open}
												<div {...props} transition:slide>
													<Table.Root class="w-full">
														<Table.Header>
															<Table.Row>
																<Table.Head class="w-12">#</Table.Head>
																<Table.Head>Contact</Table.Head>
																<Table.Head>Address</Table.Head>
																<Table.Head>Phone</Table.Head>
																<Table.Head>Notes</Table.Head>
																<Table.Head></Table.Head>
															</Table.Row>
														</Table.Header>
														<Table.Body>
															{#each driverStops as { stop, location }, index}
																<Table.Row class="">
																	<Table.Cell class="font-medium text-muted-foreground">
																		{stop.delivery_index !== null ? stop.delivery_index : index}
																	</Table.Cell>
																	<Table.Cell>
																		<div class="flex items-center">
																			<span class="font-semibold">{stop.contact_name || '—'}</span>
																		</div>
																	</Table.Cell>
																	<Table.Cell>
																		<div class="flex items-start">
																			<div class="text-sm">
																				<div class="font-medium">
																					{location.address_line_1}
																				</div>
																				<div class="text-muted-foreground">
																					{location.city || ''}{location.city && location.region
																						? ', '
																						: ''}{location.region || ''}
																					{location.postal_code || ''}
																				</div>
																			</div>
																		</div>
																	</Table.Cell>
																	<Table.Cell>
																		{#if stop.contact_phone}
																			<div class="flex items-center text-sm">
																				{stop.contact_phone}
																			</div>
																		{:else}
																			<span class="text-sm text-muted-foreground">—</span>
																		{/if}
																	</Table.Cell>
																	<Table.Cell>
																		{#if stop.notes}
																			<div
																				class="max-w-[200px] truncate text-sm"
																				title={stop.notes}
																			>
																				{stop.notes}
																			</div>
																		{:else}
																			<span class="text-sm text-muted-foreground">—</span>
																		{/if}
																	</Table.Cell>
																	<Table.Cell>
																		<Button
																			onclick={() => (focusedStopId = stop.id)}
																			size="icon"
																			variant="ghost"
																		>
																			<Eye />
																		</Button>
																	</Table.Cell>
																</Table.Row>
															{/each}
														</Table.Body>
													</Table.Root>
												</div>
											{/if}
										{/snippet}
									</Collapsible.Content>
								</div>
							</Collapsible.Root>
						{/if}
					</div>
				</div>
			{/if}
		{/each}
	</div>
{/if}
