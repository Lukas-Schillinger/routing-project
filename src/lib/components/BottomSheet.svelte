<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';

	let {
		snapsVH = [16, 48, 88],
		initial = 16,
		onDragStart = null,
		onDragEnd = null,
		children,
		header
	}: {
		snapsVH?: number[];
		initial?: number;
		onDragStart?: (() => void) | null;
		onDragEnd?: (() => void) | null;
		children?: Snippet;
		header?: Snippet;
	} = $props();

	let sheet = $state<HTMLDivElement | null>(null);
	let content = $state<HTMLDivElement | null>(null);
	let y = $state(0); // translateY in px from bottom=0
	let startY = $state(0);
	let startDragY = $state(0);
	let vh = $state(0);

	function vhToPx(v: number) {
		return (v / 100) * vh;
	}
	function clamp(val: number, min: number, max: number) {
		return Math.max(min, Math.min(max, val));
	}
	function snapToNearest() {
		const targets = snapsVH.map(vhToPx);
		const nearest = targets.reduce((a, b) =>
			Math.abs(y - b) < Math.abs(y - a) ? b : a
		);
		y = nearest;
	}

	function setFromVH(v: number) {
		y = vhToPx(v);
	}

	function onPointerDown(e: PointerEvent) {
		(e.target as Element).setPointerCapture(e.pointerId);
		startY = y;
		startDragY = e.clientY;
		if (onDragStart) onDragStart();
	}

	function onPointerMove(e: PointerEvent) {
		if (!sheet) return;
		const dy = e.clientY - startDragY;
		// invert because we measure from bottom
		const next = startY - dy;
		const min = vhToPx(snapsVH[0]); // collapsed
		const max = vhToPx(snapsVH.at(-1)!); // expanded
		y = clamp(next, min, max);
	}

	function onPointerUp() {
		snapToNearest();
		if (onDragEnd) onDragEnd();
	}

	function onResize() {
		vh = window.innerHeight;
		setFromVH(initial);
	}

	onMount(() => {
		onResize();
		window.addEventListener('resize', onResize, { passive: true });
		return () => window.removeEventListener('resize', onResize);
	});
</script>

<!-- Container anchored to bottom -->
<div
	bind:this={sheet}
	class="pointer-events-auto fixed inset-x-0 bottom-0 z-30"
	style={`transform: translateY(${vh - y}px);`}
>
	<!-- Sheet -->
	<div class="mx-auto w-full max-w-screen-md">
		<div
			class="rounded-t-2xl bg-background shadow-2xl ring-1 ring-border"
			style="padding-bottom: calc(env(safe-area-inset-bottom,0px) + 12px);"
		>
			<!-- Grab handle -->
			<div
				class="flex cursor-grab items-center justify-center py-2 select-none active:cursor-grabbing"
				role="button"
				tabindex="0"
				aria-label="Drag to resize"
				onpointerdown={onPointerDown}
				onpointermove={onPointerMove}
				onpointerup={onPointerUp}
				onpointercancel={onPointerUp}
			>
				<div class="h-1.5 w-10 rounded-full bg-muted-foreground/30"></div>
			</div>

			<!-- Header area for a title or filters -->
			{#if header}
				{@render header()}
			{/if}

			<!-- Scroll area -->
			<div bind:this={content} class="max-h-[70vh] overflow-y-auto">
				{#if children}
					{@render children()}
				{/if}
			</div>
		</div>
	</div>
</div>
