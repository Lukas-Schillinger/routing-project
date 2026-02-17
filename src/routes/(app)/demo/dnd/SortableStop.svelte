<!--
	Tailwind classes like bg-white, shadow, rounded-md on this element will be
	stripped during drag if dnd-kit uses adoptedStyleSheets for Document roots.
	See +page.svelte comment for the full explanation of the CSS cascade bug.
-->

<script lang="ts">
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { createSortable } from '@dnd-kit/svelte/sortable';

	let {
		stop,
		index,
		driverId
	}: {
		stop: StopWithLocation;
		index: number;
		driverId: string;
	} = $props();

	const sortable = createSortable({
		id: stop.stop.id,
		index,
		group: driverId
	});
</script>

<div
	{@attach sortable.attach}
	class="mb-2 flex min-h-[50px] cursor-grab items-center rounded-md bg-white px-5 text-sm text-gray-600 shadow
		data-[dnd-dragging]:cursor-grabbing data-[dnd-dragging]:bg-white/90 data-[dnd-dragging]:shadow-xl data-[dnd-dragging]:scale-[1.03]
		data-[dnd-placeholder=hidden]:opacity-40 data-[dnd-placeholder=hidden]:shadow-none
		data-[dnd-placeholder=clone]:opacity-50 data-[dnd-placeholder=clone]:shadow-sm
		data-[dnd-dropping]:shadow-lg"
>
	{index + 1}. {stop.stop.contact_name || stop.stop.id.slice(0, 8)}
</div>
