<script lang="ts">
	import { browser } from '$app/environment';
	import SphereGridLoader from '$lib/components/SphereGridLoader.svelte';
	import { inView } from 'motion';
	import { SvelteSet } from 'svelte/reactivity';
	import {
		Settings,
		Building2,
		ChevronDown,
		RotateCcw,
		Sparkles,
		Truck,
		MapPin,
		Clock,
		Plus
	} from 'lucide-svelte';

	// Real stop data for CSV preview
	const importRows = [
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
		}
	];

	const columnMappings = ['Name*', 'Address*', 'Phone'];
	const csvHeaders = ['store_name', 'street_address', 'contact_phone'];

	// Animated elapsed counter for optimization overlay
	let optimizeElapsed = $state(0);
	let optimizeTimerInterval: ReturnType<typeof setInterval> | null = null;
	let step2Visible = $state(false);

	function formatElapsed(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	$effect(() => {
		if (step2Visible) {
			optimizeElapsed = 0;
			optimizeTimerInterval = setInterval(() => {
				optimizeElapsed++;
			}, 1000);
		} else if (optimizeTimerInterval) {
			clearInterval(optimizeTimerInterval);
			optimizeTimerInterval = null;
		}

		return () => {
			if (optimizeTimerInterval) {
				clearInterval(optimizeTimerInterval);
				optimizeTimerInterval = null;
			}
		};
	});

	// Driver data for Step 03
	const driverData = [
		{
			initials: 'MR',
			name: 'Marcus Rodriguez',
			stops: 8,
			duration: '42min',
			color: 'bg-[#0f4f44]/15 text-[#0f4f44]',
			stopColor: 'bg-[#0f4f44]',
			expandedStops: [
				{ num: 1, address: '3501 S Florida Ave, Lakeland' },
				{ num: 2, address: '2515 S Florida Ave, Lakeland' },
				{ num: 3, address: '1617 US Hwy 98 S, Lakeland' }
			]
		},
		{
			initials: 'JW',
			name: 'Jessica Walsh',
			stops: 9,
			duration: '38min',
			color: 'bg-amber-600/15 text-amber-700',
			stopColor: 'bg-amber-700',
			expandedStops: [
				{ num: 1, address: '4730 S Florida Ave, Lakeland' },
				{ num: 2, address: '3636 Harden Blvd, Lakeland' },
				{ num: 3, address: '1020 E Memorial Blvd, Lakeland' }
			]
		},
		{
			initials: 'DK',
			name: 'David Kim',
			stops: 7,
			duration: '27min',
			color: 'bg-stone-500/15 text-stone-600',
			stopColor: 'bg-stone-600',
			expandedStops: [
				{ num: 1, address: '5005 S Florida Ave, Lakeland' },
				{ num: 2, address: '940 S Combee Rd, Lakeland' },
				{ num: 3, address: '3162 US Hwy 98 N, Lakeland' }
			]
		}
	];

	let expandedDrivers = new SvelteSet<string>(['MR']);

	let step1El = $state<HTMLElement | null>(null);
	let step2El = $state<HTMLElement | null>(null);
	let step3El = $state<HTMLElement | null>(null);

	function setupScrollReveal(el: HTMLElement | null) {
		if (!el || !browser) return;
		return inView(
			el,
			() => {
				el.style.opacity = '1';
				el.style.transform = 'translateY(0)';
			},
			{ amount: 0.2 }
		);
	}

	$effect(() => setupScrollReveal(step1El));
	$effect(() => {
		if (!step2El || !browser) return;
		return inView(
			step2El,
			() => {
				step2El!.style.opacity = '1';
				step2El!.style.transform = 'translateY(0)';
				step2Visible = true;
				return () => {
					step2Visible = false;
				};
			},
			{ amount: 0.2 }
		);
	});
	$effect(() => setupScrollReveal(step3El));
</script>

<section class="py-24 md:py-32">
	<div class="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
		<div class="mb-16">
			<p
				class="mb-3 text-xs font-medium tracking-[0.25em] text-landing-primary uppercase"
			>
				How it works
			</p>
			<h2
				class="max-w-lg font-serif text-4xl leading-tight tracking-tight md:text-5xl"
			>
				Three steps to faster routes
			</h2>
		</div>

		<div class="space-y-16 md:space-y-24">
			<!-- Step 01: Import -->
			<div
				bind:this={step1El}
				class="grid grid-cols-1 items-center gap-8 transition-all duration-700 ease-out md:grid-cols-2 md:gap-12"
				style="opacity: 0; transform: translateY(30px)"
			>
				<div>
					<span class="font-mono text-xs font-bold text-muted-foreground"
						>01</span
					>
					<h3 class="mt-2 font-serif text-3xl leading-tight tracking-tight">
						Import your stops
					</h3>
					<p class="mt-3 text-base leading-relaxed text-muted-foreground">
						Upload a CSV or add stops manually. We handle geocoding,
						deduplication, and validation. Your data stays clean.
					</p>
				</div>
				<!-- Vignette: Column mapping -->
				<div
					class="overflow-hidden rounded-lg border border-foreground/10 bg-card"
				>
					<div class="border-b border-foreground/10 px-3 py-2.5">
						<div class="flex items-center gap-2">
							<Settings class="h-3.5 w-3.5 text-muted-foreground" />
							<span class="text-sm font-semibold">Column Mapping</span>
							<span class="ml-auto font-mono text-[10px] text-muted-foreground"
								>grocery_stores_10.csv</span
							>
						</div>
					</div>
					<div class="overflow-x-auto">
						<table class="w-full text-xs">
							<thead>
								<!-- Mapping selects row -->
								<tr class="border-b border-foreground/5">
									{#each columnMappings as mapping (mapping)}
										<th class="px-3 py-1.5">
											<div
												class="inline-flex items-center gap-1 rounded border border-foreground/10 bg-background px-2 py-0.5"
											>
												<span
													class="text-[10px] font-medium text-landing-primary"
													>{mapping}</span
												>
												<ChevronDown
													class="h-2.5 w-2.5 text-muted-foreground"
												/>
											</div>
										</th>
									{/each}
								</tr>
								<!-- CSV header names -->
								<tr class="border-b border-foreground/5 bg-foreground/[0.02]">
									{#each csvHeaders as header (header)}
										<th
											class="px-3 py-1.5 text-left font-mono text-[10px] font-normal tracking-wider text-muted-foreground"
										>
											{header}
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each importRows as row (row.name)}
									<tr class="border-b border-foreground/[0.03] last:border-b-0">
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
						<p class="text-[10px] text-muted-foreground">
							Showing 3 of 10 rows
						</p>
					</div>
				</div>
			</div>

			<!-- Step 02: Optimize -->
			<div
				bind:this={step2El}
				class="grid grid-cols-1 items-center gap-8 transition-all duration-700 ease-out md:grid-cols-2 md:gap-12"
				style="opacity: 0; transform: translateY(30px)"
			>
				<div class="md:order-2">
					<span class="font-mono text-xs font-bold text-muted-foreground"
						>02</span
					>
					<h3 class="mt-2 font-serif text-3xl leading-tight tracking-tight">
						Optimize routes
					</h3>
					<p class="mt-3 text-base leading-relaxed text-muted-foreground">
						One click splits stops across your fleet. The solver balances
						distance, time windows, and driver capacity automatically.
					</p>
				</div>
				<!-- Vignette: Optimization toolbar + loading overlay -->
				<div
					class="overflow-hidden rounded-lg border border-foreground/10 bg-card md:order-1"
				>
					<!-- Toolbar mimicking OptimizationFooter -->
					<div
						class="flex flex-wrap items-center gap-2 border-b border-foreground/10 px-3 py-2.5"
					>
						<!-- Depot selector mock -->
						<div
							class="flex h-7 items-center gap-1.5 rounded-md border border-foreground/10 bg-background px-2.5"
						>
							<Building2 class="h-3.5 w-3.5 text-muted-foreground" />
							<span class="text-xs">Main Warehouse</span>
							<ChevronDown class="h-3 w-3 text-muted-foreground" />
						</div>

						<!-- Fairness toggle mock -->
						<div
							class="flex h-7 rounded-md border border-foreground/10 bg-muted/30 p-0.5"
						>
							<span
								class="rounded px-2 py-0.5 text-[11px] text-muted-foreground"
								>Fast</span
							>
							<span
								class="rounded bg-background px-2 py-0.5 text-[11px] font-medium shadow-sm"
								>Balanced</span
							>
							<span
								class="rounded px-2 py-0.5 text-[11px] text-muted-foreground"
								>Fair</span
							>
						</div>

						<div class="flex-1"></div>

						<!-- Action buttons mock -->
						<div class="flex items-center gap-1.5">
							<div
								class="flex h-7 items-center gap-1 rounded-md border border-foreground/10 px-2 text-muted-foreground/50"
							>
								<RotateCcw class="h-3 w-3" />
								<span class="text-[11px]">Reset</span>
							</div>
							<div
								class="flex h-7 items-center gap-1 rounded-md bg-primary px-3 text-primary-foreground"
							>
								<Sparkles class="h-3 w-3" />
								<span class="text-[11px] font-medium">Optimize</span>
							</div>
						</div>
					</div>

					<!-- Optimization overlay mock -->
					<div
						class="flex flex-col items-center justify-center gap-3 bg-background/80 py-10 backdrop-blur-sm"
					>
						<SphereGridLoader rows={4} cols={4} size={12} gap={6} />
						<p class="text-sm text-muted-foreground">Optimizing routes...</p>
						<p class="font-mono text-xs text-muted-foreground/70">
							{formatElapsed(optimizeElapsed)}
						</p>
					</div>
				</div>
			</div>

			<!-- Step 03: Dispatch -->
			<div
				bind:this={step3El}
				class="grid grid-cols-1 items-center gap-8 transition-all duration-700 ease-out md:grid-cols-2 md:gap-12"
				style="opacity: 0; transform: translateY(30px)"
			>
				<div>
					<span class="font-mono text-xs font-bold text-muted-foreground"
						>03</span
					>
					<h3 class="mt-2 font-serif text-3xl leading-tight tracking-tight">
						Dispatch to drivers
					</h3>
					<p class="mt-3 text-base leading-relaxed text-muted-foreground">
						Routes reach drivers instantly via SMS or email. Each gets a
						personalized link with turn-by-turn navigation in their preferred
						app.
					</p>
				</div>
				<!-- Vignette: Driver list -->
				<div
					class="overflow-hidden rounded-lg border border-foreground/10 bg-card"
				>
					<!-- Summary header -->
					<div
						class="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/10 px-3 py-2.5"
					>
						<div
							class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
						>
							<span class="flex items-center gap-1">
								<Truck class="h-3 w-3" />
								3 drivers
							</span>
							<span class="flex items-center gap-1">
								<MapPin class="h-3 w-3" />
								24 stops
							</span>
							<span class="flex items-center gap-1">
								<Clock class="h-3 w-3" />
								1h 47m
							</span>
						</div>
						<div
							class="flex h-6 items-center gap-1 rounded-md border border-foreground/10 px-2"
						>
							<Plus class="h-3 w-3 text-muted-foreground" />
							<span class="text-[11px]">Add Driver</span>
						</div>
					</div>

					<!-- Driver cards -->
					<div class="space-y-1.5 p-2">
						{#each driverData as driver (driver.initials)}
							{@const isExpanded = expandedDrivers.has(driver.initials)}
							<div
								class="rounded-lg {isExpanded
									? 'border border-foreground/10'
									: ''}"
							>
								<button
									type="button"
									class="flex w-full items-center gap-3 rounded-lg p-2.5 text-left hover:bg-foreground/[0.02]"
									onclick={() => {
										if (expandedDrivers.has(driver.initials)) {
											expandedDrivers.delete(driver.initials);
										} else {
											expandedDrivers.add(driver.initials);
										}
									}}
								>
									<div
										class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold {driver.color}"
									>
										{driver.initials}
									</div>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium">{driver.name}</p>
										<p class="text-xs text-muted-foreground">
											{driver.stops} stops &middot; {driver.duration}
										</p>
									</div>
									<ChevronDown
										class="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 {isExpanded
											? 'rotate-180'
											: ''}"
									/>
								</button>
								{#if isExpanded}
									<div
										class="border-t border-foreground/5 px-2.5 pt-1.5 pb-2.5"
									>
										<div class="space-y-1.5">
											{#each driver.expandedStops as stop (stop.num)}
												<div class="flex items-center gap-2.5">
													<div
														class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full {driver.stopColor} text-[9px] font-bold text-white"
													>
														{stop.num}
													</div>
													<span class="text-xs text-muted-foreground"
														>{stop.address}</span
													>
												</div>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
