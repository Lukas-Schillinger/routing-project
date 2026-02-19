<script lang="ts">
	import type { RouteSolver } from './route-solver.svelte';

	let {
		solver,
		svgClass = '',
		fit = false
	}: { solver: RouteSolver; svgClass?: string; fit?: boolean } = $props();
</script>

<div
	class="flex items-center gap-2 border-b border-foreground/10 bg-foreground/[0.02] px-4 py-2"
>
	{#if solver.phase === 'optimizing'}
		<span class="relative flex h-2 w-2">
			<span
				class="absolute inline-flex h-full w-full animate-ping rounded-full bg-landing-primary opacity-75"
			></span>
			<span class="relative inline-flex h-2 w-2 rounded-full bg-landing-primary"
			></span>
		</span>
	{:else if solver.phase === 'done'}
		<span class="inline-flex h-2 w-2 rounded-full bg-landing-primary"></span>
	{:else if solver.phase === 'constructing'}
		<span class="inline-flex h-2 w-2 rounded-full bg-landing-primary/50"></span>
	{:else}
		<span class="inline-flex h-2 w-2 rounded-full bg-muted-foreground/30"
		></span>
	{/if}
	<span class="font-mono text-[10px] text-muted-foreground">
		{#if solver.phase === 'constructing'}
			Building initial routes
		{:else if solver.phase === 'optimizing'}
			2-opt solver — {solver.iterations.toLocaleString()} iterations
		{:else if solver.phase === 'done'}
			Optimization complete
		{:else}
			Ready
		{/if}
	</span>
</div>

<div class={svgClass}>
	<svg
		viewBox="0 0 440 300"
		class={fit ? 'mx-auto block h-full max-w-full' : 'block w-full'}
		style="aspect-ratio: 440/300;"
	>
		{#each solver.gridDots as dot, di (di)}
			<circle cx={dot.x} cy={dot.y} r="0.8" class="fill-foreground/6" />
		{/each}

		{#each solver.routes as route, driverIdx (driverIdx)}
			{#if route.length > 0}
				{#key solver.routeVersions[driverIdx]}
					<path
						d={solver.buildPath(route)}
						fill="none"
						stroke={solver.driverColors[driverIdx]}
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="route-draw"
						style="animation-delay: {driverIdx * 80}ms"
					/>
				{/key}
			{/if}
		{/each}

		<rect
			x={solver.depot.x - 7}
			y={solver.depot.y - 7}
			width="14"
			height="14"
			rx="2"
			class="fill-landing-primary"
		/>
		{#each solver.stops as stop, idx (idx)}
			<circle
				cx={stop.x}
				cy={stop.y}
				r="5"
				fill={solver.stopDriverMap[idx] >= 0
					? solver.driverColors[solver.stopDriverMap[idx]]
					: '#ccc'}
				class="transition-[fill] duration-300"
			/>
		{/each}
	</svg>
</div>

<style>
	@keyframes draw-route {
		from {
			stroke-dashoffset: 2000;
			opacity: 0.15;
		}
		20% {
			opacity: 0.75;
		}
		to {
			stroke-dashoffset: 0;
			opacity: 0.75;
		}
	}

	.route-draw {
		stroke-dasharray: 2000;
		stroke-dashoffset: 2000;
		animation: draw-route 600ms ease-out forwards;
	}
</style>
