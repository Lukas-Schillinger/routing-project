<script lang="ts">
	import { stopApi } from '$lib/services/api';
	import { addressDisplay } from '$lib/utils';
	import { untrack } from 'svelte';
	import { dndzone, TRIGGERS } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type DndStop = {
		id: string;
		stop: PageData['stops'][number];
		addr: ReturnType<typeof addressDisplay>;
	};

	let columns = untrack(() => buildColumns(data));

	function buildColumns(d: PageData) {
		const map: Record<
			string,
			{ driver: (typeof d.assignedDrivers)[number]; items: DndStop[] }
		> = {};
		for (const driver of d.assignedDrivers) {
			map[driver.id] = {
				driver,
				items: d.stops
					.filter((s) => s.stop.driver_id === driver.id)
					.sort(
						(a, b) =>
							(a.stop.delivery_index ?? Infinity) -
							(b.stop.delivery_index ?? Infinity)
					)
					.map((s) => ({
						id: s.stop.id,
						stop: s,
						addr: addressDisplay(s.location)
					}))
			};
		}
		return map;
	}

	function handleConsider(driverId: string, e: CustomEvent) {
		columns[driverId].items = e.detail.items;
	}

	function handleFinalize(driverId: string, e: CustomEvent) {
		columns[driverId].items = e.detail.items;

		const { trigger, id } = e.detail.info;

		// Cross-column moves fire finalize on both zones: target first, then origin.
		// Skip the target's event — the dragged item's original driver differs from this column.
		if (trigger === TRIGGERS.DROPPED_INTO_ZONE) {
			const draggedItem = columns[driverId].items.find(
				(item: DndStop) => item.id === id
			);
			if (draggedItem && draggedItem.stop.stop.driver_id !== driverId) return;
		}

		const updates: {
			stop_id: string;
			driver_id: string;
			delivery_index: number;
		}[] = [];
		for (const [did, col] of Object.entries(columns)) {
			for (let i = 0; i < col.items.length; i++) {
				const item = col.items[i];
				if (
					item.stop.stop.driver_id !== did ||
					item.stop.stop.delivery_index !== i
				) {
					updates.push({ stop_id: item.id, driver_id: did, delivery_index: i });
				}
			}
		}

		if (updates.length === 0) return;
		stopApi.reorder(data.mapId, updates).catch(console.error);
	}
</script>

<div class="p-8">
	<h1 class="mb-4 text-2xl font-bold">DnD Demo</h1>

	<div class="flex gap-4">
		{#each Object.entries(columns) as [driverId, col] (driverId)}
			<div class="w-64 border p-4">
				<h2 class="mb-2 font-bold">{col.driver.name}</h2>
				<div
					class="flex min-h-12 flex-col gap-2"
					use:dndzone={{ items: col.items, flipDurationMs: 200, type: 'stops' }}
					onconsider={(e) => handleConsider(driverId, e)}
					onfinalize={(e) => handleFinalize(driverId, e)}
				>
					{#each col.items as item (item.id)}
						<div
							animate:flip={{ duration: 200 }}
							class="flex cursor-grab items-start gap-3 rounded-md border bg-card p-2 text-card-foreground shadow-sm"
						>
							<div
								class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
							>
								{col.items.indexOf(item) + 1}
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
			</div>
		{/each}
	</div>
</div>
