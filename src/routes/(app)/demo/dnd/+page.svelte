<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import * as Avatar from '$lib/components/ui/avatar';
	import { stopApi } from '$lib/services/api';
	import { addressDisplay, getIdenticon } from '$lib/utils';
	import { ChevronDown, GripVertical, Package } from 'lucide-svelte';
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import { SvelteSet } from 'svelte/reactivity';
	import { slide } from 'svelte/transition';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const UNASSIGNED = 'unassigned';

	type StopWithLocation = PageData['stops'][number];
	type DndStop = {
		id: string;
		stop: StopWithLocation;
		addr: ReturnType<typeof addressDisplay>;
	};

	function toDndStop(s: StopWithLocation): DndStop {
		return { id: s.stop.id, stop: s, addr: addressDisplay(s.location) };
	}

	// One mutable list per column — exactly like the two-list example
	let lists: Record<string, DndStop[]> = $state(buildLists());

	function buildLists(): Record<string, DndStop[]> {
		const byDriver = Object.groupBy(
			data.stops,
			(s) => s.stop.driver_id ?? UNASSIGNED
		);
		const result: Record<string, DndStop[]> = {};
		for (const driver of data.assignedDrivers) {
			result[driver.id] = (byDriver[driver.id] ?? [])
				.sort(
					(a, b) =>
						(a.stop.delivery_index ?? Infinity) -
						(b.stop.delivery_index ?? Infinity)
				)
				.map(toDndStop);
		}
		result[UNASSIGNED] = (byDriver[UNASSIGNED] ?? []).map(toDndStop);
		return result;
	}

	let saving = $state(false);

	let columnIds = $derived([
		...data.assignedDrivers.map((d) => d.id),
		UNASSIGNED
	]);
	let driverLookup = $derived(
		Object.fromEntries(data.assignedDrivers.map((d) => [d.id, d]))
	);
	let expandedColumns = new SvelteSet<string>(
		data.assignedDrivers.map((d) => d.id).concat(UNASSIGNED)
	);

	function handleConsider(
		columnId: string,
		e: CustomEvent<DndEvent<DndStop>>
	): void {
		lists[columnId] = e.detail.items;
	}

	// Non-reactive batching: cross-zone drops fire finalize on both columns
	// synchronously, so queueMicrotask collects both before flushing once.
	let touchedColumns = new SvelteSet<string>();
	let flushQueued = false;

	function handleFinalize(
		columnId: string,
		e: CustomEvent<DndEvent<DndStop>>
	): void {
		lists[columnId] = e.detail.items;
		touchedColumns.add(columnId);
		if (!flushQueued) {
			flushQueued = true;
			queueMicrotask(flushChanges);
		}
	}

	function flushChanges(): void {
		flushQueued = false;
		const updates: {
			stop_id: string;
			driver_id: string | null;
			delivery_index: number;
		}[] = [];
		for (const colId of touchedColumns) {
			const driverId = colId === UNASSIGNED ? null : colId;
			lists[colId].forEach((item, index) => {
				updates.push({
					stop_id: item.id,
					driver_id: driverId,
					delivery_index: index
				});
			});
		}
		touchedColumns.clear();
		if (updates.length > 0) {
			persistChanges(updates);
		}
	}

	async function persistChanges(
		updates: {
			stop_id: string;
			driver_id: string | null;
			delivery_index: number;
		}[]
	): Promise<void> {
		console.log('[dnd] saving', updates.length, 'updates', updates);
		saving = true;
		try {
			const result = await stopApi.reorder(data.mapId, updates);
			console.log('[dnd] server responded with', result.stops.length, 'stops');
			await invalidateAll();
			console.log('[dnd] invalidated, rebuilding lists from server data');
			lists = buildLists();
			console.log('[dnd] done');
		} catch (err) {
			console.error('[dnd] save failed, reverting to server state', err);
			await invalidateAll();
			lists = buildLists();
		} finally {
			saving = false;
		}
	}

	function toggleExpanded(columnId: string): void {
		if (expandedColumns.has(columnId)) {
			expandedColumns.delete(columnId);
		} else {
			expandedColumns.add(columnId);
		}
	}

	function getLabel(columnId: string): string {
		if (columnId === UNASSIGNED) return 'Unassigned';
		return driverLookup[columnId]?.name ?? 'Unknown';
	}
</script>

<div class="mx-auto max-w-sm p-4">
	<h1 class="mb-4 text-lg font-semibold">
		Drivers
		{#if saving}
			<span class="ml-2 text-sm font-normal text-muted-foreground">
				Saving...
			</span>
		{/if}
	</h1>

	<div class="space-y-2">
		{#each columnIds as columnId (columnId)}
			{@const driver = driverLookup[columnId]}
			{@const items = lists[columnId]}
			{@const isExpanded = expandedColumns.has(columnId)}

			<div class="rounded-lg border border-border/50 transition-colors">
				<div class="flex items-center gap-3 p-3">
					<button
						type="button"
						class="-m-1 flex flex-1 items-center gap-3 rounded-md p-1 text-left hover:bg-accent/30"
						onclick={() => toggleExpanded(columnId)}
					>
						{#if driver}
							<Avatar.Root class="h-9 w-9 border border-border/50">
								<Avatar.Image
									src={getIdenticon(driver)}
									alt={getLabel(columnId)}
								/>
								<Avatar.Fallback class="text-xs">
									{getLabel(columnId).slice(0, 2).toUpperCase()}
								</Avatar.Fallback>
							</Avatar.Root>
						{:else}
							<div
								class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted"
							>
								<Package class="h-4 w-4 text-muted-foreground" />
							</div>
						{/if}

						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium">
								{getLabel(columnId)}
							</p>
							<div
								class="flex items-center gap-3 text-xs text-muted-foreground"
							>
								<span>
									{items.length} stop{items.length !== 1 ? 's' : ''}
								</span>
							</div>
						</div>

						<ChevronDown
							class="h-4 w-4 transition-transform duration-200 {isExpanded
								? 'rotate-180'
								: ''}"
						/>
					</button>
				</div>

				{#if isExpanded}
					<div
						class="border-t border-border/50 px-3 py-2"
						transition:slide={{ duration: 200 }}
					>
						<div
							class="flex min-h-10 flex-col"
							use:dndzone={{
								items,
								flipDurationMs: 200,
								type: 'stops'
							}}
							onconsider={(e) => handleConsider(columnId, e)}
							onfinalize={(e) => handleFinalize(columnId, e)}
						>
							{#each items as item, index (item.id)}
								<div
									animate:flip={{ duration: 200 }}
									class="flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-accent/50"
								>
									<div
										class="shrink-0 cursor-grab self-center text-muted-foreground hover:text-foreground"
									>
										<GripVertical class="h-4 w-4" />
									</div>
									<div
										class="flex h-5 w-5 shrink-0 items-center justify-center self-center rounded-full bg-primary/10 text-xs font-medium text-primary"
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
								</div>
							{/each}
						</div>

						{#if items.length === 0}
							<p class="py-4 text-center text-sm text-muted-foreground">
								No stops assigned
							</p>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
