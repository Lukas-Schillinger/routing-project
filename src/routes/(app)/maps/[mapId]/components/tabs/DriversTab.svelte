<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import EditOrCreateDriverPopover from '$lib/components/EditOrCreateDriverPopover';
	import {
		Copy,
		DropdownMenu,
		Remove,
		View
	} from '$lib/components/TableActionsDropdown.Items';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import * as Command from '$lib/components/ui/command';
	import * as Empty from '$lib/components/ui/empty';
	import * as Popover from '$lib/components/ui/popover';
	import { ServiceError } from '$lib/errors';
	import type { Route as RouteType } from '$lib/schemas';
	import type { Driver } from '$lib/schemas/driver';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { mapApi } from '$lib/services/api';
	import { addressDisplay, getIdenticon } from '$lib/utils';
	import {
		ChevronDown,
		Clock,
		Ellipsis,
		Eye,
		EyeOff,
		MapPin,
		Pencil,
		Plus,
		Printer,
		Route,
		Truck,
		UserPlus
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { slide } from 'svelte/transition';

	let {
		stops,
		assignedDrivers,
		allDrivers,
		routes,
		mapId,
		hiddenDrivers = $bindable([]),
		onRemoveDriver,
		onZoomToStop
	}: {
		stops: StopWithLocation[];
		assignedDrivers: Driver[];
		allDrivers: Driver[];
		routes: RouteType[];
		mapId: string;
		hiddenDrivers?: Driver[];
		onRemoveDriver: (driverId: string) => void;
		onZoomToStop: (stopId: string) => void;
	} = $props();

	// Add driver popover state
	let addPopoverOpen = $state(false);
	let localIsLoading = $state(false);

	// Track which routes are expanded
	let expandedRoutes = $state<Set<string>>(new Set());

	// Get available drivers (non-temporary, not already assigned)
	const availableDrivers = $derived.by(() => {
		const assignedDriverIds = new Set(assignedDrivers.map((d) => d.id));
		return allDrivers.filter(
			(driver) => !driver.temporary && !assignedDriverIds.has(driver.id)
		);
	});

	// Group stops by driver
	const routesByDriver = $derived.by(() => {
		const grouped = new SvelteMap<string, StopWithLocation[]>();

		assignedDrivers.forEach((driver) => {
			grouped.set(driver.id, []);
		});

		stops.forEach((stop) => {
			if (stop.stop.driver_id) {
				const driverStops = grouped.get(stop.stop.driver_id) || [];
				driverStops.push(stop);
				grouped.set(stop.stop.driver_id, driverStops);
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
			drivers: assignedDrivers.length,
			stops: totalStops,
			routes: routes.length,
			duration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
			hasDuration: totalDuration > 0
		};
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
			duration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
			hasDuration: durationMinutes > 0
		};
	}

	function getRouteForDriver(driverId: string): RouteType | undefined {
		return routes.find((r) => r.driver_id === driverId);
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

	async function addExistingDriver(driverId: string) {
		if (localIsLoading) return;

		localIsLoading = true;

		try {
			await mapApi.addDriver(mapId, driverId);
			await invalidateAll();
			addPopoverOpen = false;
		} catch (err) {
			const message =
				err instanceof ServiceError ? err.message : 'Failed to assign driver';
			toast.error('Error adding driver', { description: message });
		} finally {
			localIsLoading = false;
		}
	}

	function handleCopyId(id: string) {
		navigator.clipboard.writeText(id);
	}

	function handleDriverCreated() {
		addPopoverOpen = false;
		invalidateAll();
	}
</script>

<div class="flex h-full flex-col">
	<!-- Summary Header -->
	<div class="flex items-center justify-between border-b border-border/50 py-3">
		<div class="flex items-center gap-4 text-sm">
			<span class="flex items-center gap-1.5 text-muted-foreground">
				<Truck class="h-3.5 w-3.5" />
				{totals.drivers} driver{totals.drivers !== 1 ? 's' : ''}
			</span>
			{#if totals.routes > 0}
				<span class="flex items-center gap-1.5 text-muted-foreground">
					<Route class="h-3.5 w-3.5" />
					{totals.routes} route{totals.routes !== 1 ? 's' : ''}
				</span>
			{/if}
			<span class="flex items-center gap-1.5 text-muted-foreground">
				<MapPin class="h-3.5 w-3.5" />
				{totals.stops} stop{totals.stops !== 1 ? 's' : ''}
			</span>
			{#if totals.hasDuration}
				<span class="flex items-center gap-1.5 text-muted-foreground">
					<Clock class="h-3.5 w-3.5" />
					{totals.duration}
				</span>
			{/if}
		</div>

		<Popover.Root bind:open={addPopoverOpen}>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" class="gap-1.5 px-2">
						<Plus class="h-3.5 w-3.5" />
						Add Driver
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-[260px] p-0" align="end">
				<Command.Root>
					<Command.Input
						placeholder="Search existing drivers..."
						disabled={localIsLoading}
					/>
					<Command.Empty>No drivers found.</Command.Empty>
					{#if availableDrivers.length > 0}
						<Command.Group heading="Existing Drivers">
							{#each availableDrivers as driver (driver.id)}
								<Command.Item
									value={driver.name}
									onSelect={() => addExistingDriver(driver.id)}
									disabled={localIsLoading}
								>
									<div class="flex items-center gap-2">
										<Avatar.Root class="h-6 w-6">
											<Avatar.Image
												src={getIdenticon(driver)}
												alt={driver.name}
											/>
											<Avatar.Fallback class="text-xs">
												{driver.name.slice(0, 2).toUpperCase()}
											</Avatar.Fallback>
										</Avatar.Root>
										<span class="truncate">{driver.name}</span>
									</div>
								</Command.Item>
							{/each}
						</Command.Group>
					{/if}
					<Command.Separator />
					<Command.Group heading="Create New">
						<EditOrCreateDriverPopover
							mode="create"
							{mapId}
							onSuccess={handleDriverCreated}
						>
							{#snippet children({ props })}
								<button
									{...props}
									type="button"
									class="relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground"
								>
									<UserPlus class="h-4 w-4" />
									Create new driver
								</button>
							{/snippet}
						</EditOrCreateDriverPopover>
						<EditOrCreateDriverPopover
							mode="create"
							{mapId}
							temporaryDriver={true}
							onSuccess={handleDriverCreated}
						>
							{#snippet children({ props })}
								<button
									{...props}
									type="button"
									class="relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground outline-none select-none hover:bg-accent hover:text-accent-foreground"
								>
									<Plus class="h-4 w-4" />
									Create temporary driver
								</button>
							{/snippet}
						</EditOrCreateDriverPopover>
					</Command.Group>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	</div>

	<!-- Driver Cards List -->
	<div class="flex-1 space-y-2 overflow-auto py-4">
		{#if assignedDrivers.length === 0}
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon">
						<Truck />
					</Empty.Media>
					<Empty.Title>No drivers yet</Empty.Title>
					<Empty.Description
						>Add your first driver to get started</Empty.Description
					>
				</Empty.Header>
			</Empty.Root>
		{:else}
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
					<!-- Driver Card Header -->
					<div class="flex items-center gap-3 p-3">
						<!-- Clickable expand area -->
						<button
							type="button"
							class="-m-1 flex flex-1 items-center gap-3 rounded-md p-1 text-left hover:bg-accent/30"
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
								<div
									class="flex items-center gap-3 text-xs text-muted-foreground"
								>
									<span
										>{stats.totalStops} stop{stats.totalStops !== 1
											? 's'
											: ''}</span
									>
									{#if stats.hasDuration}
										<span>{stats.duration}</span>
									{/if}
								</div>
							</div>

							<ChevronDown
								class="h-4 w-4 transition-transform duration-200 {isExpanded
									? 'rotate-180'
									: ''}"
							/>
						</button>

						<!-- Dropdown Menu -->
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button
										{...props}
										variant="ghost"
										size="icon"
										class="h-7 w-7"
									>
										<Ellipsis class="h-4 w-4" />
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end">
								<EditOrCreateDriverPopover
									triggerClass="block w-full"
									mode="edit"
									{driver}
									{mapId}
									onSuccess={() => invalidateAll()}
								>
									{#snippet children({ props })}
										<button
											{...props}
											type="button"
											class="relative flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground"
										>
											<Pencil class="mr-2 h-4 w-4" />
											Edit driver
										</button>
									{/snippet}
								</EditOrCreateDriverPopover>

								<Copy label="Copy ID" onclick={() => handleCopyId(driver.id)} />

								{#if route}
									<DropdownMenu.Separator />
									<View href="/routes/{route.id}" label="View route" />
									<a
										href={resolve(`/routes/${route.id}/printable`)}
										target="_blank"
									>
										<DropdownMenu.Item>
											<Printer class="h-4 w-4" />
											Print route
										</DropdownMenu.Item>
									</a>
								{/if}

								<DropdownMenu.Separator />

								<DropdownMenu.Item
									onclick={() => toggleDriverVisibility(driver)}
								>
									{#if isHidden}
										<Eye class="h-4 w-4" />
										Show on map
									{:else}
										<EyeOff class="h-4 w-4" />
										Hide on map
									{/if}
								</DropdownMenu.Item>

								<Remove
									label="Remove from map"
									onclick={() => onRemoveDriver(driver.id)}
								/>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>

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
		{/if}
	</div>
</div>
