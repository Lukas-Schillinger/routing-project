<script lang="ts">
	import { browser } from '$app/environment';
	import { ChevronDown, Settings } from 'lucide-svelte';
	import { inView, scroll } from 'motion';

	// Configurable: rows shown in the card table vs total rows on the paper
	const TABLE_ROWS = 6;
	const PAPER_ROWS = 8;

	// Full stop data pool
	const allStops = [
		{
			name: 'Walmart Supercenter',
			address: '3501 S Florida Ave, Lakeland',
			phone: '(863) 644-2255'
		},
		{
			name: 'Publix Southgate',
			address: '2515 S Florida Ave, Lakeland',
			phone: '(863) 682-1033'
		},
		{
			name: 'Publix Grove Park',
			address: '1617 US Hwy 98 S, Lakeland',
			phone: '(863) 665-0023'
		},
		{
			name: 'Target',
			address: '4617 US Hwy 98 N, Lakeland',
			phone: '(863) 816-2087'
		},
		{
			name: 'Costco Wholesale',
			address: '3850 US Hwy 98 N, Lakeland',
			phone: '(863) 603-3042'
		},
		{
			name: 'Aldi',
			address: '2720 US Hwy 92 W, Auburndale',
			phone: '(855) 955-2534'
		},
		{
			name: 'Winn-Dixie',
			address: '1490 Town Center Dr, Lakeland',
			phone: '(863) 688-4295'
		},
		{
			name: "Trader Joe's",
			address: '901 E Memorial Blvd, Lakeland',
			phone: '(863) 577-3811'
		},
		{
			name: 'Whole Foods Market',
			address: '130 W Pipkin Rd, Lakeland',
			phone: '(863) 450-1284'
		},
		{
			name: 'Sprouts Farmers',
			address: '3975 S Florida Ave, Lakeland',
			phone: '(863) 937-8120'
		},
		{
			name: 'Fresh Market',
			address: '2631 E County Rd 540A, Lakeland',
			phone: '(863) 248-0091'
		},
		{
			name: 'Save-A-Lot',
			address: '808 W Memorial Blvd, Lakeland',
			phone: '(863) 686-3090'
		},
		{
			name: 'Dollar General',
			address: '4210 N Florida Ave, Lakeland',
			phone: '(863) 853-1271'
		},
		{
			name: 'Walgreens',
			address: '1401 S Florida Ave, Lakeland',
			phone: '(863) 682-8301'
		},
		{
			name: 'CVS Pharmacy',
			address: '2140 E Edgewood Dr, Lakeland',
			phone: '(863) 666-5574'
		},
		{
			name: 'Wawa',
			address: '4745 US Hwy 98 N, Lakeland',
			phone: '(863) 603-1188'
		},
		{
			name: 'Circle K',
			address: '502 E Main St, Lakeland',
			phone: '(863) 688-9012'
		},
		{
			name: '7-Eleven',
			address: '1305 Ariana St, Lakeland',
			phone: '(863) 688-7110'
		},
		{
			name: 'RaceTrac',
			address: '6767 US Hwy 98 N, Lakeland',
			phone: '(863) 859-4420'
		},
		{
			name: 'Shell Station',
			address: '5375 N Socrum Loop Rd, Lakeland',
			phone: '(863) 859-2233'
		}
	];

	const importRows = allStops.slice(0, TABLE_ROWS);
	const paperStops = allStops.slice(0, PAPER_ROWS);

	// CSV text for the paper element (derived from full paper set)
	const csvLines = [
		'store_name,street_address,contact_phone',
		...paperStops.map((r) => `${r.name},"${r.address}",${r.phone}`)
	];

	let animationEl = $state<HTMLElement | null>(null);
	let textEl = $state<HTMLElement | null>(null);

	// Scroll-driven animation state
	let scrollProgress = $state(0);

	// Paper feeds from above the card downward. Synchronized with row reveals.
	// Wider range = animation progresses slower relative to scroll speed.
	const FEED_START = 0;
	const FEED_END = 0.75;
	const FEED_RANGE = FEED_END - FEED_START;

	// Paper translation: starts above, travels downward behind the card.
	// Each CSV line is ~18px tall; header + PAPER_ROWS data lines.
	const paperHeight = (PAPER_ROWS + 1) * 18 + 20; // lines + padding
	const paperT = $derived(
		Math.min(Math.max((scrollProgress - FEED_START) / FEED_RANGE, 0), 1)
	);
	const paperTranslateY = $derived(paperT * paperHeight);

	// Table row i appears when CSV data line i crosses the card edge.
	// Line i crosses at fraction (i+1)/PAPER_ROWS of the total paper travel.
	const rowOpacities = $derived(
		importRows.map((_, i) => {
			const threshold = FEED_START + ((i + 1) / PAPER_ROWS) * FEED_RANGE;
			return Math.min(Math.max((scrollProgress - threshold) / 0.025, 0), 1);
		})
	);

	const visibleRowCount = $derived(rowOpacities.filter((o) => o >= 0.5).length);

	// Total stops "loaded" from the paper (counts all PAPER_ROWS, not just TABLE_ROWS)
	const totalLoadedCount = $derived(
		Array.from({ length: PAPER_ROWS }, (_, i) => {
			const threshold = FEED_START + ((i + 1) / PAPER_ROWS) * FEED_RANGE;
			return scrollProgress >= threshold ? 1 : 0;
		}).reduce((a: number, b: number) => a + b, 0)
	);

	const hasOverflow = $derived(totalLoadedCount > TABLE_ROWS);

	// Mobile: Sonner-style toast stack animation
	// Continuous float tracking how many stops have been consumed into the card.
	// Uses same thresholds as rowOpacities so toast exits sync with row appearances.
	const TOAST_MAX_VISIBLE = 3;
	const TOAST_TRANSITION = 0.07; // scroll fraction per toast enter/exit
	const consumedFloat = $derived(
		Array.from({ length: PAPER_ROWS }, (_, i) => {
			const threshold = FEED_START + ((i + 1) / PAPER_ROWS) * FEED_RANGE;
			return Math.min(
				Math.max((scrollProgress - threshold) / TOAST_TRANSITION, 0),
				1
			);
		}).reduce((a: number, b: number) => a + b, 0)
	);

	const mobileToasts = $derived.by(() => {
		const base = Math.floor(consumedFloat);
		const frac = consumedFloat - base;

		const toasts: Array<{
			idx: number;
			stop: (typeof allStops)[0];
			y: number;
			scale: number;
			opacity: number;
			z: number;
		}> = [];

		for (let i = 0; i <= TOAST_MAX_VISIBLE; i++) {
			const idx = base + i;
			if (idx >= PAPER_ROWS) break;

			const pos = i - frac; // effective stack position (negative = exiting)

			if (pos < -0.9) continue;

			let y: number, scale: number, opacity: number;

			if (pos < 0) {
				// Exiting: slides down behind the card (z-10 covers it)
				const exit = -pos;
				y = exit * 56;
				scale = 1 - exit * 0.03;
				opacity = 1;
			} else {
				// In stack: Sonner-style depth (scale down, offset up)
				y = -pos * 14;
				scale = 1 - pos * 0.05;
				opacity = pos > 2 ? 0 : 1 - pos * 0.15;
			}

			toasts.push({
				idx,
				stop: allStops[idx],
				y,
				scale: Math.max(scale, 0.85),
				opacity: Math.max(Math.min(opacity, 1), 0),
				z: TOAST_MAX_VISIBLE + 1 - i
			});
		}

		return toasts;
	});

	// Start tracking from the paper's position (above the card) through card exit.
	// The negative offset extends tracking to where the paper sits visually.
	$effect(() => {
		if (!animationEl || !browser) return;
		return scroll(
			(progress: number) => {
				scrollProgress = progress;
			},
			{
				target: animationEl,
				offset: [`-${paperHeight}px end`, 'end start']
			}
		);
	});

	$effect(() => {
		if (!textEl || !browser) return;
		return inView(
			textEl,
			() => {
				textEl!.style.opacity = '1';
				textEl!.style.transform = 'translateY(0)';
			},
			{ amount: 0.2 }
		);
	});
</script>

<div class="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
	<div
		bind:this={textEl}
		class="transition-all duration-700 ease-out"
		style="opacity: 0; transform: translateY(30px)"
	>
		<span class="font-mono text-xs font-bold text-muted-foreground">01</span>
		<h3 class="mt-2 font-serif text-3xl leading-tight tracking-tight">
			Import your stops
		</h3>
		<p class="mt-3 text-base leading-relaxed text-muted-foreground">
			Upload a CSV or add stops manually. We handle geocoding, deduplication,
			and validation. Your data stays clean.
		</p>
	</div>
	<!-- Vignette: Column mapping with paper-feed animation -->
	<div bind:this={animationEl} class="relative mt-14 md:mt-0">
		<!-- Desktop: Paper element feeds downward behind card -->
		<div
			class="pointer-events-none absolute inset-x-4 bottom-full z-0 hidden rounded-md border border-amber-900/10 bg-[#fefcf7] px-3 py-2.5 shadow-lg md:block dark:border-amber-200/10 dark:bg-[#2a2520]"
			style="transform: translateY({paperTranslateY}px)"
		>
			<div
				class="space-y-0.5 font-mono text-[10px] leading-relaxed text-amber-900/70 dark:text-amber-200/60"
			>
				{#each csvLines as line, i (i)}
					<p class:font-semibold={i === 0} class="truncate">{line}</p>
				{/each}
			</div>
		</div>

		<!-- Mobile: Sonner-style toast stack drops into the card -->
		{#each mobileToasts as toast (toast.idx)}
			<div
				class="pointer-events-none absolute inset-x-2 bottom-full md:hidden"
				style="transform: translateY({toast.y}px) scale({toast.scale}); opacity: {toast.opacity}; z-index: {toast.z}; transform-origin: bottom center"
			>
				<div
					class="rounded-md border border-amber-900/10 bg-[#fefcf7] px-3 py-1.5 shadow-sm dark:border-amber-200/10 dark:bg-[#2a2520]"
				>
					<p
						class="truncate font-mono text-[10px] leading-relaxed text-amber-900/70 dark:text-amber-200/60"
					>
						{toast.stop.name},"{toast.stop.address}",{toast.stop.phone}
					</p>
				</div>
			</div>
		{/each}

		<!-- Card: sits on top, paper slides behind it from above -->
		<div
			class="relative z-10 overflow-hidden rounded-lg border border-foreground/10 bg-card"
		>
			<!-- Scanner slot line at top of card -->
			<div
				class="h-0.5 bg-gradient-to-r from-transparent via-foreground/20 to-transparent"
			></div>
			<div class="border-b border-foreground/10 px-3 py-2.5">
				<div class="flex items-center gap-2">
					<Settings class="h-3.5 w-3.5 text-muted-foreground" />
					<span class="text-sm font-semibold">Column Mapping</span>
					<span class="ml-auto font-mono text-[10px] text-muted-foreground"
						>grocery_stores_{PAPER_ROWS}.csv</span
					>
				</div>
			</div>
			<div class="overflow-x-clip">
				<table class="w-full text-xs">
					<tbody>
						{#each importRows as row, i (row.name)}
							{@const opacity = rowOpacities[i]}
							<tr
								class="border-b border-foreground/[0.03] last:border-b-0"
								style="opacity: {opacity}; transform: translateY({(1 -
									opacity) *
									6}px)"
							>
								<td class="px-3 py-1.5 text-xs">{row.name}</td>
								<td class="px-3 py-1.5 text-xs text-muted-foreground"
									>{row.address}</td
								>
								<td class="px-3 py-1.5 text-xs text-muted-foreground"
									>{row.phone}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="border-t border-foreground/10 px-3 py-1.5">
				<div class="flex items-center justify-between">
					<p class="text-[10px] text-muted-foreground">
						{#if totalLoadedCount > 0}
							Showing {Math.min(visibleRowCount, TABLE_ROWS)} of {totalLoadedCount}
							stops loaded
						{:else}
							Waiting for import...
						{/if}
					</p>
					<div
						class="flex items-center gap-2 transition-all duration-300"
						style="opacity: {hasOverflow
							? 1
							: 0}; transform: translateY({hasOverflow ? 0 : 4}px)"
					>
						<span class="text-[10px] text-muted-foreground tabular-nums"
							>Page 1 of {Math.ceil(totalLoadedCount / TABLE_ROWS)}</span
						>
						<div class="flex items-center gap-1">
							<button
								type="button"
								class="flex h-5 w-5 items-center justify-center rounded border border-foreground/10 text-muted-foreground"
							>
								<ChevronDown class="h-3 w-3 rotate-90" />
							</button>
							<button
								type="button"
								class="flex h-5 w-5 items-center justify-center rounded border border-foreground/10 text-muted-foreground"
							>
								<ChevronDown class="h-3 w-3 -rotate-90" />
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
