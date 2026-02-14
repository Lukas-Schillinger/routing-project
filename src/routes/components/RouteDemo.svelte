<script lang="ts">
	import { browser } from '$app/environment';
	import { inView } from 'motion';

	// --- Seeded PRNG (mulberry32) ---
	function mulberry32(seed: number) {
		return () => {
			seed |= 0;
			seed = (seed + 0x6d2b79f5) | 0;
			let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	const depot = { x: 220, y: 150 };
	const NUM_STOPS = 20;
	const NUM_DRIVERS = 3;

	type Point = { x: number; y: number };

	function generateStops(rand: () => number): Point[] {
		const pts: Point[] = [];
		for (let i = 0; i < NUM_STOPS; i++) {
			let x: number, y: number;
			do {
				x = 30 + rand() * 380;
				y = 20 + rand() * 260;
			} while (Math.abs(x - depot.x) < 30 && Math.abs(y - depot.y) < 30);
			pts.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
		}
		return pts;
	}

	let stops = $state<Point[]>(generateStops(mulberry32(42)));

	const driverColors = ['#0f4f44', '#d4a853', '#8a8578'];

	// --- Distance helpers ---
	function dist(a: Point, b: Point): number {
		const dx = a.x - b.x;
		const dy = a.y - b.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	function routeDistance(route: number[]): number {
		if (route.length === 0) return 0;
		let d = dist(depot, stops[route[0]]);
		for (let i = 1; i < route.length; i++) {
			d += dist(stops[route[i - 1]], stops[route[i]]);
		}
		d += dist(stops[route[route.length - 1]], depot);
		return d;
	}

	function totalDistance(rts: number[][]): number {
		return rts.reduce((sum, r) => sum + routeDistance(r), 0);
	}

	// --- Chaotic initial solution: round-robin on shuffled stops ---
	function buildInitialSolution(rand: () => number): number[][] {
		const indices = Array.from({ length: NUM_STOPS }, (_, i) => i);
		// Fisher-Yates shuffle with seeded RNG
		for (let i = indices.length - 1; i > 0; i--) {
			const j = Math.floor(rand() * (i + 1));
			[indices[i], indices[j]] = [indices[j], indices[i]];
		}
		// Round-robin assign — geographically distant stops end up together
		const groups: number[][] = Array.from({ length: NUM_DRIVERS }, () => []);
		for (let i = 0; i < indices.length; i++) {
			groups[i % NUM_DRIVERS].push(indices[i]);
		}
		return groups;
	}

	// --- State ---
	let phase = $state<'idle' | 'constructing' | 'optimizing' | 'done'>('idle');
	let isVisible = $state(false);
	let routes = $state<number[][]>([[], [], []]);
	let routeVersions = $state<number[]>([0, 0, 0]);
	let displayDistance = $state(0);
	let initialDistance = $state(0);
	let iterations = $state(0);
	let improvements = $state(0);
	let tweenGen = $state(0);
	let runId = 0;

	const improvement = $derived(
		initialDistance > 0
			? Math.round(
					((initialDistance - displayDistance) / initialDistance) * 100
				)
			: 0
	);

	const stopDriverMap = $derived.by(() => {
		const map = new Array<number>(NUM_STOPS).fill(-1);
		for (let d = 0; d < routes.length; d++) {
			for (const idx of routes[d]) {
				map[idx] = d;
			}
		}
		return map;
	});

	// --- SVG path builder ---
	function buildPath(route: number[]): string {
		if (route.length === 0) return '';
		const points = [depot, ...route.map((i) => stops[i]), depot];
		return points
			.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
			.join(' ');
	}

	// --- Tween with generation guard ---
	function tweenNumber(
		from: number,
		to: number,
		duration: number,
		cb: (v: number) => void
	) {
		if (!browser) return;
		const gen = ++tweenGen;
		const start = performance.now();
		function tick(now: number) {
			if (gen !== tweenGen) return;
			const t = Math.min((now - start) / duration, 1);
			const eased = 1 - Math.pow(1 - t, 3);
			cb(Math.round((from + (to - from) * eased) * 10) / 10);
			if (t < 1) requestAnimationFrame(tick);
		}
		requestAnimationFrame(tick);
	}

	function delay(ms: number): Promise<void> {
		return new Promise((r) => setTimeout(r, ms));
	}

	// --- 2-opt for a single route ---
	async function twoOptPass(
		driverIdx: number,
		currentRun: number
	): Promise<boolean> {
		let route = routes[driverIdx];
		if (route.length < 3) return false;
		let foundAny = false;

		for (let i = 0; i < route.length - 1; i++) {
			for (let j = i + 2; j < route.length; j++) {
				if (!isVisible || runId !== currentRun) return false;
				iterations++;

				const before = segmentCost(route, i, j);
				const reversed = [...route];
				let left = i + 1;
				let right = j;
				while (left < right) {
					[reversed[left], reversed[right]] = [reversed[right], reversed[left]];
					left++;
					right--;
				}
				const after = segmentCost(reversed, i, j);

				if (after < before - 0.01) {
					route = reversed;
					routes[driverIdx] = reversed;
					improvements++;
					foundAny = true;
					routeVersions[driverIdx]++;

					const newTotal = totalDistance(routes);
					tweenNumber(displayDistance, newTotal, 400, (v) => {
						displayDistance = v;
					});
					await delay(350);
					if (!isVisible || runId !== currentRun) return false;
				}
			}
			await delay(20);
			if (!isVisible || runId !== currentRun) return false;
		}
		return foundAny;
	}

	function segmentCost(route: number[], i: number, j: number): number {
		const prevPoint = i === 0 ? depot : stops[route[i - 1]];
		const nextPoint = j === route.length - 1 ? depot : stops[route[j + 1]];
		let cost =
			dist(prevPoint, stops[route[i]]) + dist(stops[route[j]], nextPoint);
		for (let k = i; k < j; k++) {
			cost += dist(stops[route[k]], stops[route[k + 1]]);
		}
		return cost;
	}

	// --- Inter-route relocate ---
	async function relocatePass(currentRun: number): Promise<boolean> {
		let foundAny = false;

		for (let srcDriver = 0; srcDriver < NUM_DRIVERS; srcDriver++) {
			for (let si = 0; si < routes[srcDriver].length; si++) {
				if (!isVisible || runId !== currentRun) return false;

				const stopIdx = routes[srcDriver][si];
				const removeCost = removalSaving(routes[srcDriver], si);

				let bestDriver = -1;
				let bestPos = -1;
				let bestInsertCost = Infinity;

				for (let dstDriver = 0; dstDriver < NUM_DRIVERS; dstDriver++) {
					if (dstDriver === srcDriver) continue;
					for (let di = 0; di <= routes[dstDriver].length; di++) {
						iterations++;
						const cost = insertionCost(routes[dstDriver], di, stopIdx);
						if (cost < bestInsertCost) {
							bestInsertCost = cost;
							bestDriver = dstDriver;
							bestPos = di;
						}
					}
				}

				if (bestDriver >= 0 && bestInsertCost - removeCost < -1) {
					const newSrc = [...routes[srcDriver]];
					newSrc.splice(si, 1);
					const newDst = [...routes[bestDriver]];
					newDst.splice(bestPos, 0, stopIdx);

					routes[srcDriver] = newSrc;
					routes[bestDriver] = newDst;
					improvements++;
					foundAny = true;
					routeVersions[srcDriver]++;
					routeVersions[bestDriver]++;
					si--;

					const newTotal = totalDistance(routes);
					tweenNumber(displayDistance, newTotal, 400, (v) => {
						displayDistance = v;
					});
					await delay(400);
					if (!isVisible || runId !== currentRun) return false;
				}
			}
			await delay(20);
			if (!isVisible || runId !== currentRun) return false;
		}
		return foundAny;
	}

	function removalSaving(route: number[], idx: number): number {
		const prev = idx === 0 ? depot : stops[route[idx - 1]];
		const curr = stops[route[idx]];
		const next = idx === route.length - 1 ? depot : stops[route[idx + 1]];
		return dist(prev, curr) + dist(curr, next) - dist(prev, next);
	}

	function insertionCost(
		route: number[],
		pos: number,
		stopIdx: number
	): number {
		const prev = pos === 0 ? depot : stops[route[pos - 1]];
		const next = pos === route.length ? depot : stops[route[pos]];
		const point = stops[stopIdx];
		return dist(prev, point) + dist(point, next) - dist(prev, next);
	}

	// --- Main solver loop ---
	async function runSolver() {
		if (!isVisible) return;

		const currentRun = ++runId;
		iterations = 0;
		improvements = 0;
		tweenGen++;
		phase = 'constructing';

		// Fresh RNG per run — new stop cloud + new shuffle each cycle
		const solverRng = mulberry32(42 + currentRun);
		stops = generateStops(solverRng);
		const initial = buildInitialSolution(solverRng);
		routes = initial.map((r) => [...r]);
		routeVersions = [0, 0, 0];

		const startDist = totalDistance(routes);
		initialDistance = startDist;
		displayDistance = startDist;

		await delay(800);
		if (!isVisible || runId !== currentRun) return;

		phase = 'optimizing';
		const deadline = performance.now() + 12_000;
		const expired = () => performance.now() > deadline;

		// 2-opt passes until convergence or time cap
		let improved = true;
		while (improved && isVisible && runId === currentRun && !expired()) {
			improved = false;
			for (let d = 0; d < NUM_DRIVERS; d++) {
				if (!isVisible || runId !== currentRun || expired()) break;
				const got = await twoOptPass(d, currentRun);
				if (got) improved = true;
			}
		}

		if (!isVisible || runId !== currentRun) return;

		// Inter-route relocate + follow-up 2-opt (skip if time's up)
		if (!expired()) {
			let relocateImproved = true;
			while (
				relocateImproved &&
				isVisible &&
				runId === currentRun &&
				!expired()
			) {
				relocateImproved = await relocatePass(currentRun);
				if (
					relocateImproved &&
					isVisible &&
					runId === currentRun &&
					!expired()
				) {
					for (let d = 0; d < NUM_DRIVERS; d++) {
						if (!isVisible || runId !== currentRun || expired()) break;
						await twoOptPass(d, currentRun);
					}
				}
			}
		}

		if (!isVisible || runId !== currentRun) return;

		const finalDist = totalDistance(routes);
		tweenNumber(displayDistance, finalDist, 300, (v) => {
			displayDistance = v;
		});

		phase = 'done';
		await delay(4000);
		if (!isVisible || runId !== currentRun) return;

		runSolver();
	}

	// --- Visibility observer ---
	let containerEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (!containerEl || !browser) return;

		const cleanup = inView(
			containerEl,
			() => {
				isVisible = true;
				runSolver();
				return () => {
					isVisible = false;
				};
			},
			{ amount: 0.15 }
		);

		return cleanup;
	});

	// --- Dot grid points ---
	const gridDots: Point[] = (() => {
		const dots: Point[] = [];
		for (let x = 20; x <= 420; x += 20) {
			for (let y = 20; y <= 280; y += 20) {
				dots.push({ x, y });
			}
		}
		return dots;
	})();
</script>

<section class="py-12 md:py-20">
	<div bind:this={containerEl} class="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
		<div class="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
			<!-- Left: context + live stats -->
			<div>
				<p
					class="mb-3 text-xs font-medium tracking-[0.25em] text-landing-primary uppercase"
				>
					The problem
				</p>
				<h2
					class="font-serif text-4xl leading-tight tracking-tight md:text-5xl"
				>
					Route math doesn't scale
				</h2>
				<p class="mt-3 text-base leading-relaxed text-muted-foreground">
					Twenty stops, three drivers, billions of possible combinations.
					Finding the shortest set of routes is NP-hard — there is no shortcut,
					only better heuristics.
				</p>

				<!-- Live stats row -->
				<div
					class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4"
				>
					<div>
						<p
							class="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase"
						>
							Distance
						</p>
						<p class="mt-0.5 font-mono text-2xl font-extralight tracking-tight">
							{displayDistance.toFixed(1)}
						</p>
					</div>
					<div>
						<p
							class="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase"
						>
							Saved
						</p>
						<p
							class="mt-0.5 font-mono text-2xl font-extralight tracking-tight {improvement >
							0
								? 'text-landing-primary'
								: 'text-foreground'}"
						>
							{improvement > 0 ? `-${improvement}` : '0'}%
						</p>
					</div>
					<div>
						<p
							class="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase"
						>
							Iterations
						</p>
						<p class="mt-0.5 font-mono text-2xl font-extralight tracking-tight">
							{iterations.toLocaleString()}
						</p>
					</div>
					<div>
						<p
							class="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase"
						>
							Swaps
						</p>
						<p class="mt-0.5 font-mono text-2xl font-extralight tracking-tight">
							{improvements}
						</p>
					</div>
				</div>
			</div>

			<!-- Right: SVG animation -->
			<div
				class="overflow-hidden rounded-sm border border-foreground/10 bg-card"
			>
				<!-- Status strip -->
				<div
					class="flex items-center gap-2 border-b border-foreground/10 px-4 py-2"
				>
					{#if phase === 'optimizing'}
						<span class="relative flex h-2 w-2">
							<span
								class="absolute inline-flex h-full w-full animate-ping rounded-full bg-landing-primary opacity-75"
							></span>
							<span
								class="relative inline-flex h-2 w-2 rounded-full bg-landing-primary"
							></span>
						</span>
					{:else if phase === 'done'}
						<span class="inline-flex h-2 w-2 rounded-full bg-landing-primary"
						></span>
					{:else if phase === 'constructing'}
						<span class="inline-flex h-2 w-2 rounded-full bg-landing-primary/50"
						></span>
					{:else}
						<span
							class="inline-flex h-2 w-2 rounded-full bg-muted-foreground/30"
						></span>
					{/if}
					<span class="font-mono text-[10px] text-muted-foreground">
						{#if phase === 'constructing'}
							Building initial routes
						{:else if phase === 'optimizing'}
							2-opt solver — {iterations.toLocaleString()} iterations
						{:else if phase === 'done'}
							Optimization complete
						{:else}
							Ready
						{/if}
					</span>
				</div>

				<div class="">
					<svg
						viewBox="0 0 440 300"
						class="w-full"
						style="aspect-ratio: 440/300;"
					>
						{#each gridDots as dot, di (di)}
							<circle cx={dot.x} cy={dot.y} r="0.8" class="fill-foreground/6" />
						{/each}

						{#each routes as route, driverIdx (driverIdx)}
							{#if route.length > 0}
								{#key routeVersions[driverIdx]}
									<path
										d={buildPath(route)}
										fill="none"
										stroke={driverColors[driverIdx]}
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
							x={depot.x - 7}
							y={depot.y - 7}
							width="14"
							height="14"
							rx="2"
							class="fill-landing-primary"
						/>
						<text
							x={depot.x}
							y={depot.y - 13}
							text-anchor="middle"
							class="fill-muted-foreground text-[8px] font-semibold tracking-wider uppercase"
							>Depot</text
						>

						{#each stops as stop, idx (idx)}
							<circle
								cx={stop.x}
								cy={stop.y}
								r="6"
								fill="var(--background)"
								stroke={stopDriverMap[idx] >= 0
									? driverColors[stopDriverMap[idx]]
									: '#ccc'}
								stroke-width="2"
								class="transition-[stroke] duration-300"
							/>
							<text
								x={stop.x}
								y={stop.y + 3.5}
								text-anchor="middle"
								class="fill-foreground text-[7px] font-bold">{idx + 1}</text
							>
						{/each}
					</svg>
				</div>
			</div>
		</div>
	</div>
</section>

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
