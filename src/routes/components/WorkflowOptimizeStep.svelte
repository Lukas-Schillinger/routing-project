<script lang="ts">
	import { browser } from '$app/environment';
	import { inView } from 'motion';
	import { RouteSolver } from './route-solver.svelte';
	import RouteSolverSvg from './RouteSolverSvg.svelte';

	const solver = new RouteSolver();

	let containerEl = $state<HTMLElement | null>(null);

	$effect(() => {
		if (!containerEl || !browser) return;
		return inView(
			containerEl,
			() => {
				containerEl!.style.opacity = '1';
				containerEl!.style.transform = 'translateY(0)';
				solver.setVisible(true);
				return () => {
					solver.setVisible(false);
				};
			},
			{ amount: 0.2 }
		);
	});
</script>

<div
	bind:this={containerEl}
	class="grid grid-cols-1 items-center gap-8 transition-all duration-700 ease-out md:grid-cols-2 md:gap-12"
	style="opacity: 0; transform: translateY(30px)"
>
	<!-- Right: Text -->
	<div class="md:order-2">
		<span class="font-mono text-xs font-bold text-muted-foreground">02</span>
		<h3 class="mt-2 font-serif text-3xl leading-tight tracking-tight">
			Optimize routes
		</h3>
		<p class="mt-3 text-base leading-relaxed text-muted-foreground">
			One click splits stops across your fleet. The solver balances distance,
			time windows, and driver capacity automatically.
		</p>
	</div>

	<!-- Left: Stats + Route solver animation -->
	<div class="flex flex-col gap-4 md:order-1 md:flex-row md:items-center">
		<!-- Route solver animation -->
		<div
			class=" min-w-0 flex-1 overflow-hidden rounded-sm border border-foreground/10 bg-card shadow-md ring-1 shadow-foreground/5 ring-foreground/[0.03]"
		>
			<RouteSolverSvg {solver} />
		</div>
		<!-- Stats: horizontal row on mobile, vertical stack on desktop -->
		<div
			class="grid grid-cols-4 gap-3 rounded-sm border border-foreground/10 bg-foreground/[0.02] p-3 md:grid-cols-1 md:gap-4 md:border-0 md:bg-transparent md:p-0"
		>
			<div>
				<p
					class="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase"
				>
					Distance
				</p>
				<p
					class="mt-0.5 font-mono text-xl font-extralight tracking-tight md:text-2xl"
				>
					{solver.displayDistance.toFixed(1)}
				</p>
			</div>
			<div>
				<p
					class="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase"
				>
					Saved
				</p>
				<p
					class="mt-0.5 font-mono text-xl font-extralight tracking-tight md:text-2xl {solver.improvement >
					0
						? 'text-landing-primary'
						: 'text-foreground'}"
				>
					{solver.improvement > 0 ? `-${solver.improvement}` : '0'}%
				</p>
			</div>
			<div>
				<p
					class="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase"
				>
					Iterations
				</p>
				<p
					class="mt-0.5 font-mono text-xl font-extralight tracking-tight md:text-2xl"
				>
					{solver.iterations.toLocaleString()}
				</p>
			</div>
			<div>
				<p
					class="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase"
				>
					Swaps
				</p>
				<p
					class="mt-0.5 font-mono text-xl font-extralight tracking-tight md:text-2xl"
				>
					{solver.improvements}
				</p>
			</div>
		</div>
	</div>
</div>
