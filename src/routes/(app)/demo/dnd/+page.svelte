<!--
	DnD Kit + Tailwind v4 CSS Cascade Issue
	========================================

	Tailwind styling breaks on dragged elements (e.g. bg-white, shadow, rounded
	all disappear) due to a CSS cascade conflict between dnd-kit and Tailwind v4.

	Root cause:
	- dnd-kit injects its CSS via adoptedStyleSheets (in StyleSheetManager.ts)
	- adoptedStyleSheets are ordered AFTER all regular stylesheets in the cascade
	- dnd-kit's CSS includes `@layer { :where([data-dnd-dragging][popover]) { background: unset; ... } }`
	- Tailwind v4 uses real CSS @layer declarations (`@layer utilities { ... }`)
	- Layer priority = declaration order. Later layers beat earlier layers.
	- Since adoptedStyleSheets come last, dnd-kit's @layer is declared after
	  Tailwind's @layer utilities, giving it HIGHER priority
	- Result: dnd-kit's `background: unset` nukes Tailwind's `bg-white`

	This is NOT framework-specific. The bug is in @dnd-kit/dom's StyleSheetManager,
	which is shared by both @dnd-kit/react and @dnd-kit/svelte. Any project using
	dnd-kit with a CSS framework that uses real @layer declarations (like Tailwind v4)
	will hit this. Projects using Tailwind v3 are unaffected because v3's @layer
	directives are build-time only (PostCSS) — the browser never sees real @layer
	declarations, so Tailwind's output is unlayered CSS which always beats layered CSS.

	Fix (applied to our fork):
	- In StyleSheetManager.ts#inject, use a <style> element prepended to <head>
	  for Document roots instead of adoptedStyleSheets
	- This makes dnd-kit's @layer the FIRST declared layer (lowest priority)
	- Keep adoptedStyleSheets for ShadowRoot where encapsulation is needed

	This demo page works correctly because [the fix is/isn't yet applied] —
	check SortableStop.svelte for Tailwind classes on dragged elements.
-->

<script lang="ts">
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { DragDropProvider } from '@dnd-kit/svelte';
	import type { PageData } from './$types';
	import SortableStop from './SortableStop.svelte';

	let { data }: { data: PageData } = $props();

	let stopsByDriver = $state<Map<string, StopWithLocation[]>>(new Map());

	$effect(() => {
		const grouped = new Map<string, StopWithLocation[]>();
		data.assignedDrivers.forEach((driver) => {
			grouped.set(driver.id, []);
		});
		data.stops.forEach((stop) => {
			if (stop.stop.driver_id) {
				const driverStops = grouped.get(stop.stop.driver_id) || [];
				driverStops.push(stop);
				grouped.set(stop.stop.driver_id, driverStops);
			}
		});
		grouped.forEach((stops) => {
			stops.sort(
				(a, b) =>
					(a.stop.delivery_index ?? Infinity) -
					(b.stop.delivery_index ?? Infinity)
			);
		});
		stopsByDriver = grouped;
	});

	function handleDragEnd(event: any) {
		console.log('dragEnd', event);
	}
</script>

<div class="p-8">
	<h1 class="mb-4 text-2xl font-bold">DnD Kit Demo</h1>

	<DragDropProvider onDragEnd={handleDragEnd}>
		<div class="flex gap-4">
			{#each data.assignedDrivers as driver (driver.id)}
				{@const driverStops = stopsByDriver.get(driver.id) || []}
				<div class="w-64 border p-4">
					<h2 class="mb-2 font-bold">{driver.name}</h2>
					{#each driverStops as stop, index (stop.stop.id)}
						<SortableStop {stop} {index} driverId={driver.id} />
					{/each}
				</div>
			{/each}
		</div>
	</DragDropProvider>
</div>
