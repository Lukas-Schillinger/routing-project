<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { INVALIDATION_KEYS } from '$lib/invalidation-keys';
	import { resolve } from '$app/paths';
	import { ConfirmDeleteDialog } from '$lib/components/ConfirmDeleteDialog';
	import DropdownMetadataLabel from '$lib/components/DropdownMetadataLabel.svelte';
	import EditOrCreateDriverPopover from '$lib/components/EditOrCreateDriverPopover';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import * as Command from '$lib/components/ui/command';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Empty from '$lib/components/ui/empty';
	import * as Popover from '$lib/components/ui/popover';
	import { ServiceError } from '$lib/errors';
	import type { Route as RouteType } from '$lib/schemas';
	import type { Driver } from '$lib/schemas/driver';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { mapApi, stopApi } from '$lib/services/api';
	import { addressDisplay, getIdenticon } from '$lib/utils';
	import {
		ChevronDown,
		Clock,
		Copy,
		Ellipsis,
		Eye,
		EyeOff,
		GripVertical,
		Loader2,
		MapPin,
		Pencil,
		Plus,
		Printer,
		Route,
		Truck,
		UserMinus,
		UserPlus
	} from 'lucide-svelte';
	import { untrack } from 'svelte';
	import { dragHandle, dragHandleZone, type DndEvent } from 'svelte-dnd-action';
	import { toast } from 'svelte-sonner';
	import { flip } from 'svelte/animate';
	import { slide } from 'svelte/transition';

	let {
		stops,
		assignedDrivers,
		allDrivers,
		routes,
		mapId,
		hiddenDrivers = $bindable([]),
		expandedDrivers = $bindable<string[]>([]),
		onRemoveDriver,
		onZoomToStop
	}: {
		stops: StopWithLocation[];
		assignedDrivers: Driver[];
		allDrivers: Driver[];
		routes: RouteType[];
		mapId: string;
		hiddenDrivers?: Driver[];
		expandedDrivers?: string[];
		onRemoveDriver: (driverId: string) => void;
		onZoomToStop: (stopId: string) => void;
	} = $props();

	let addPopoverOpen = $state(false);
	let localIsLoading = $state(false);

	const UNASSIGNED = 'unassigned';

	type DndStop = {
		id: string;
		stop: StopWithLocation;
		addr: ReturnType<typeof addressDisplay>;
	};

	type Column = {
		label: string;
		driver?: Driver;
		items: DndStop[];
	};

	function toDndStop(s: StopWithLocation): DndStop {
		return { id: s.stop.id, stop: s, addr: addressDisplay(s.location) };
	}

	function buildColumns(): Record<string, Column> {
		const stopsByDriver = Object.groupBy(
			stops,
			(s) => s.stop.driver_id ?? UNASSIGNED
		);
		const driverColumns = Object.fromEntries(
			assignedDrivers.map((driver) => [
				driver.id,
				{
					label: driver.name,
					driver,
					items: (stopsByDriver[driver.id] ?? [])
						.sort(
							(a, b) =>
								(a.stop.delivery_index ?? Infinity) -
								(b.stop.delivery_index ?? Infinity)
						)
						.map(toDndStop)
				}
			])
		);
		return {
			...driverColumns,
			[UNASSIGNED]: {
				label: 'Unassigned',
				items: (stopsByDriver[UNASSIGNED] ?? []).map(toDndStop)
			}
		};
	}

	type StopPosition = { driver_id: string | null; delivery_index: number };

	function snapshotPositions(
		cols: Record<string, Column>
	): Map<string, StopPosition> {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- not reactive state, just a lookup table
		const positions = new Map<string, StopPosition>();
		for (const [colId, col] of Object.entries(cols)) {
			const driverId = colId === UNASSIGNED ? null : colId;
			col.items.forEach((item, index) => {
				positions.set(item.id, { driver_id: driverId, delivery_index: index });
			});
		}
		return positions;
	}

	let columns: Record<string, Column> = $state(untrack(() => buildColumns()));
	let original = untrack(() => snapshotPositions(columns));
	let pendingSaves = $state(0);

	const availableDrivers = $derived.by(() => {
		const assignedDriverIds = new Set(assignedDrivers.map((d) => d.id));
		return allDrivers.filter(
			(driver) => !driver.temporary && !assignedDriverIds.has(driver.id)
		);
	});

	function formatDuration(seconds: number): {
		text: string;
		hasValue: boolean;
	} {
		const totalMinutes = Math.floor(seconds / 60);
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;
		return {
			text: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
			hasValue: totalMinutes > 0
		};
	}

	const totals = $derived.by(() => {
		const totalSeconds = routes.reduce(
			(acc, r) => acc + (Number(r.duration) || 0),
			0
		);
		const duration = formatDuration(totalSeconds);

		return {
			drivers: assignedDrivers.length,
			stops: stops.length,
			routes: routes.length,
			duration: duration.text,
			hasDuration: duration.hasValue
		};
	});

	function getRouteStats(stopCount: number, driverId: string) {
		const driverRoute = routes.find((r) => r.driver_id === driverId);
		const duration = formatDuration(
			driverRoute?.duration ? Number(driverRoute.duration) : 0
		);

		return {
			totalStops: stopCount,
			duration: duration.text,
			hasDuration: duration.hasValue
		};
	}

	function getRouteForDriver(driverId: string): RouteType | undefined {
		return routes.find((r) => r.driver_id === driverId);
	}

	function toggleExpanded(columnId: string): void {
		if (expandedDrivers.includes(columnId)) {
			expandedDrivers = expandedDrivers.filter((id) => id !== columnId);
		} else {
			expandedDrivers = [...expandedDrivers, columnId];
		}
	}

	const hiddenDriverIds = $derived(new Set(hiddenDrivers.map((d) => d.id)));

	function toggleDriverVisibility(driver: Driver): void {
		if (hiddenDriverIds.has(driver.id)) {
			hiddenDrivers = hiddenDrivers.filter((d) => d.id !== driver.id);
		} else {
			hiddenDrivers = [...hiddenDrivers, driver];
		}
	}

	function handleConsider(
		columnId: string,
		e: CustomEvent<DndEvent<DndStop>>
	): void {
		columns[columnId].items = e.detail.items;
		columns = { ...columns };
	}

	function handleFinalize(
		columnId: string,
		e: CustomEvent<DndEvent<DndStop>>
	): void {
		columns[columnId].items = e.detail.items;
		columns = { ...columns };
		saveColumn(columnId);
	}

	// Each finalize saves its own column independently. For cross-zone moves,
	// the target and source columns update non-overlapping sets of stops,
	// so both API calls are safe to run concurrently. We reconcile state
	// with the server only after the last pending save completes.
	async function saveColumn(columnId: string): Promise<void> {
		const driverId = columnId === UNASSIGNED ? null : columnId;
		const updates = columns[columnId].items
			.map((item, index) => ({
				stop_id: item.id,
				driver_id: driverId,
				delivery_index: index
			}))
			.filter((u) => {
				const orig = original.get(u.stop_id);
				return (
					!orig ||
					orig.driver_id !== u.driver_id ||
					orig.delivery_index !== u.delivery_index
				);
			});
		if (updates.length === 0) return;

		pendingSaves++;
		try {
			await stopApi.reorder(mapId, updates);
		} catch {
			toast.error('Failed to reorder stops');
		} finally {
			pendingSaves--;
			if (pendingSaves === 0) {
				await invalidate(INVALIDATION_KEYS.MAP_DATA);
				columns = buildColumns();
				original = snapshotPositions(columns);
			}
		}
	}

	async function addExistingDriver(driverId: string): Promise<void> {
		if (localIsLoading) return;

		localIsLoading = true;

		try {
			await mapApi.addDriver(mapId, driverId);
			await invalidate(INVALIDATION_KEYS.MAP_DATA);
			columns = buildColumns();
			original = snapshotPositions(columns);
			addPopoverOpen = false;
		} catch (err) {
			const message =
				err instanceof ServiceError ? err.message : 'Failed to assign driver';
			toast.error('Error adding driver', { description: message });
		} finally {
			localIsLoading = false;
		}
	}

	function handleCopyId(id: string): void {
		navigator.clipboard.writeText(id);
		toast.success('Copied to clipboard');
	}

	async function handleDriverCreated(): Promise<void> {
		addPopoverOpen = false;
		await invalidate(INVALIDATION_KEYS.MAP_DATA);
		columns = buildColumns();
		original = snapshotPositions(columns);
	}

	async function handleDriverEdited(): Promise<void> {
		await invalidate(INVALIDATION_KEYS.MAP_DATA);
		columns = buildColumns();
		original = snapshotPositions(columns);
	}

	async function handleRemoveDriver(driverId: string): Promise<void> {
		await onRemoveDriver(driverId);
		columns = buildColumns();
		original = snapshotPositions(columns);
	}
</script>

<div class="@container flex h-full flex-col">
	<!-- Summary Header -->
	<div
		class="flex flex-col items-center justify-between gap-2 border-b border-border/50 py-3 @sm:flex-row @sm:gap-0"
	>
		<div
			class="flex w-full justify-around gap-3 text-sm tabular-nums @sm:w-max"
		>
			<span
				class="flex items-center gap-1 whitespace-nowrap text-muted-foreground"
			>
				<Truck class="h-3.5 w-3.5" />
				{totals.drivers} driver{totals.drivers !== 1 ? 's' : ''}
			</span>
			{#if totals.routes > 0}
				<span
					class="flex items-center gap-1 whitespace-nowrap text-muted-foreground"
				>
					<Route class="h-3.5 w-3.5" />
					{totals.routes} route{totals.routes !== 1 ? 's' : ''}
				</span>
			{/if}
			<span
				class="flex items-center gap-1 whitespace-nowrap text-muted-foreground"
			>
				<MapPin class="h-3.5 w-3.5" />
				{totals.stops} stop{totals.stops !== 1 ? 's' : ''}
			</span>
			{#if totals.hasDuration}
				<span
					class="flex items-center gap-1 whitespace-nowrap text-muted-foreground"
				>
					<Clock class="h-3.5 w-3.5" />
					{totals.duration}
				</span>
			{/if}
		</div>

		<div class="flex w-full justify-end @sm:w-max @sm:justify-start">
			<Popover.Root bind:open={addPopoverOpen}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="outline"
							class="gap-1.5 px-2"
							disabled={localIsLoading}
						>
							{#if localIsLoading}
								<Loader2 class="h-3.5 w-3.5 animate-spin" />
								Adding…
							{:else}
								<Plus class="h-3.5 w-3.5" />
								Add Driver
							{/if}
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-65 p-0" align="end">
					<Command.Root>
						<Command.Input
							placeholder="Search existing drivers…"
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
										<div class="flex min-w-0 items-center gap-2">
											<Avatar.Root class="h-6 w-6 shrink-0">
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
			{#each Object.entries(columns) as [columnId, col] (columnId)}
				{@const stats = getRouteStats(col.items.length, columnId)}
				{@const route = getRouteForDriver(columnId)}
				{@const isHidden = col.driver
					? hiddenDriverIds.has(col.driver.id)
					: false}
				{@const isExpanded = expandedDrivers.includes(columnId)}

				<div
					class="rounded-lg border border-border/50 transition-colors"
					class:opacity-50={isHidden}
				>
					<!-- Column Header -->
					<div class="flex items-center gap-3 p-3">
						<!-- Clickable expand area -->
						<button
							type="button"
							class="-m-1 flex flex-1 items-center gap-3 rounded-md p-1 text-left hover:bg-accent/30"
							onclick={() => toggleExpanded(columnId)}
						>
							{#if col.driver}
								<Avatar.Root class="h-9 w-9 border border-border/50">
									<Avatar.Image
										src={getIdenticon(col.driver)}
										alt={col.driver.name}
									/>
									<Avatar.Fallback class="text-xs">
										{col.driver.name.slice(0, 2).toUpperCase()}
									</Avatar.Fallback>
								</Avatar.Root>
							{:else}
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground/60 transition-colors hover:border-muted-foreground/60 hover:text-muted-foreground"
								></div>
							{/if}

							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">{col.label}</p>
								<div
									class="flex items-center gap-3 text-xs text-muted-foreground tabular-nums"
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

						{#if col.driver}
							<!-- Dropdown Menu -->
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button
											{...props}
											variant="ghost"
											size="icon"
											class="h-7 w-7"
											aria-label="Driver options"
										>
											<Ellipsis class="h-4 w-4" />
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<EditOrCreateDriverPopover
										triggerClass="w-full"
										mode="edit"
										driver={col.driver}
										{mapId}
										onSuccess={handleDriverEdited}
									>
										{#snippet children({ props })}
											<DropdownMenu.ActionButton {...props}>
												<Pencil />
												Edit driver
											</DropdownMenu.ActionButton>
										{/snippet}
									</EditOrCreateDriverPopover>

									<DropdownMenu.Item
										onclick={() => handleCopyId(col.driver!.id)}
									>
										<Copy />
										Copy ID
									</DropdownMenu.Item>

									{#if route}
										<DropdownMenu.Separator />
										<a href={resolve(`/routes/${route.id}`)}>
											<DropdownMenu.Item>
												<Eye />
												View route
											</DropdownMenu.Item>
										</a>
										<a
											href={resolve(`/routes/${route.id}/printable`)}
											target="_blank"
										>
											<DropdownMenu.Item>
												<Printer />
												Print route
											</DropdownMenu.Item>
										</a>
									{/if}

									<DropdownMenu.Separator />

									<DropdownMenu.Item
										onclick={() => toggleDriverVisibility(col.driver!)}
									>
										{#if isHidden}
											<Eye />
											Show on map
										{:else}
											<EyeOff />
											Hide on map
										{/if}
									</DropdownMenu.Item>

									<ConfirmDeleteDialog
										variant="remove"
										title="Remove Driver"
										description="Are you sure you want to remove this driver from the map? Their stops will be unassigned."
										onConfirm={() => handleRemoveDriver(col.driver!.id)}
									>
										{#snippet trigger({ props })}
											<DropdownMenu.ActionButton {...props}>
												<UserMinus />
												Remove from map
											</DropdownMenu.ActionButton>
										{/snippet}
									</ConfirmDeleteDialog>
									<DropdownMetadataLabel item={col.driver!} />
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						{/if}
					</div>

					<!-- Stops List (Collapsible) -->
					{#if isExpanded}
						<div
							class="border-t border-border/50 px-3 py-2"
							transition:slide={{ duration: 200 }}
						>
							<div
								class="flex min-h-10 flex-col"
								use:dragHandleZone={{
									items: col.items,
									flipDurationMs: 200,
									type: 'stops'
								}}
								onconsider={(e) => handleConsider(columnId, e)}
								onfinalize={(e) => handleFinalize(columnId, e)}
							>
								{#each col.items as item, index (item.id)}
									<div
										animate:flip={{ duration: 200 }}
										class="flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-accent/50"
									>
										<button
											use:dragHandle
											disabled={pendingSaves > 0}
											aria-label="Drag to reorder"
											class="shrink-0 cursor-grab self-center text-muted-foreground hover:text-foreground disabled:cursor-default disabled:opacity-50"
										>
											<GripVertical class="h-4 w-4" />
										</button>
										<button
											type="button"
											class="flex min-w-0 flex-1 items-center gap-3 text-left"
											onclick={() => onZoomToStop(item.id)}
										>
											<div
												class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary tabular-nums"
											>
												{index + 1}
											</div>
											<div class="min-w-0 flex-1">
												<p class="truncate text-sm">
													{item.stop.stop.contact_name || item.addr.topLine}
												</p>
												<p class="truncate text-xs text-muted-foreground">
													{#if item.stop.stop.contact_name}
														{item.addr.topLine}
													{:else}
														{item.addr.bottomLine}
													{/if}
												</p>
											</div>
										</button>
									</div>
								{/each}
							</div>

							{#if col.items.length === 0}
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
