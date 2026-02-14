<script lang="ts">
	import { browser } from '$app/environment';
	import { inView } from 'motion';

	// Real stop data from test_data/grocery_stores_10.csv
	const importRows = [
		{ name: 'Walmart Supercenter', address: '3501 S Florida Ave, Lakeland' },
		{ name: 'Publix Southgate', address: '2515 S Florida Ave, Lakeland' },
		{ name: 'Publix Grove Park', address: '1617 US Hwy 98 S, Lakeland' },
		{ name: 'Publix Oakbridge', address: '3636 Harden Blvd, Lakeland' },
		{ name: 'Publix Lake Miriam', address: '4730 S Florida Ave, Lakeland' }
	];

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
	$effect(() => setupScrollReveal(step2El));
	$effect(() => setupScrollReveal(step3El));
</script>

<section class="py-24 md:py-32">
	<div class="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
		<div class="mb-16">
			<p class="mb-3 text-xs font-medium tracking-[0.25em] text-landing-primary uppercase">
				How it works
			</p>
			<h2 class="max-w-lg font-serif text-4xl leading-tight tracking-tight md:text-5xl">
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
					<span class="font-mono text-xs font-bold text-muted-foreground">01</span>
					<h3 class="mt-2 font-serif text-3xl leading-tight tracking-tight">Import your stops</h3>
					<p class="mt-3 text-base leading-relaxed text-muted-foreground">
						Upload a CSV or add stops manually. We handle geocoding, deduplication,
						and validation. Your data stays clean.
					</p>
				</div>
				<!-- Vignette: Mini data table -->
				<div class="overflow-hidden rounded-sm border border-foreground/10 bg-card">
					<div class="border-b border-foreground/10 bg-foreground/[0.02] px-4 py-2.5">
						<div class="flex items-center gap-2">
							<div class="h-2.5 w-2.5 rounded-full bg-landing-primary/40"></div>
							<span class="font-mono text-[10px] text-muted-foreground">grocery_stores_10.csv</span>
						</div>
					</div>
					<table class="w-full text-xs">
						<thead>
							<tr class="border-b border-foreground/5 text-left">
								<th class="px-4 py-2 font-mono text-[10px] font-medium tracking-wider text-muted-foreground uppercase">#</th>
								<th class="px-4 py-2 font-mono text-[10px] font-medium tracking-wider text-muted-foreground uppercase">Name</th>
								<th class="hidden px-4 py-2 font-mono text-[10px] font-medium tracking-wider text-muted-foreground uppercase sm:table-cell">Address</th>
							</tr>
						</thead>
						<tbody>
							{#each importRows as row, i (row.name)}
								<tr class="border-b border-foreground/[0.03]">
									<td class="px-4 py-2 font-mono text-muted-foreground">{i + 1}</td>
									<td class="px-4 py-2 font-medium">{row.name}</td>
									<td class="hidden px-4 py-2 text-muted-foreground sm:table-cell">{row.address}</td>
								</tr>
							{/each}
						</tbody>
					</table>
					<div class="border-t border-foreground/5 px-4 py-2 text-right">
						<span class="font-mono text-[10px] text-muted-foreground">5 of 10 stops</span>
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
					<span class="font-mono text-xs font-bold text-muted-foreground">02</span>
					<h3 class="mt-2 font-serif text-3xl leading-tight tracking-tight">Optimize routes</h3>
					<p class="mt-3 text-base leading-relaxed text-muted-foreground">
						One click splits stops across your fleet. The solver balances
						distance, time windows, and driver capacity automatically.
					</p>
				</div>
				<!-- Vignette: Compact solver output -->
				<div class="overflow-hidden rounded-sm border border-foreground/10 bg-card md:order-1">
					<div class="border-b border-foreground/10 bg-foreground/[0.02] px-4 py-2.5">
						<div class="flex items-center gap-2">
							<span class="inline-flex h-2.5 w-2.5 rounded-full bg-landing-primary"></span>
							<span class="font-mono text-[10px] text-muted-foreground">Optimization result</span>
						</div>
					</div>
					<div class="grid grid-cols-2 gap-px bg-foreground/5">
						<div class="bg-card px-4 py-3">
							<p class="font-mono text-[10px] text-muted-foreground uppercase">Distance</p>
							<p class="mt-0.5 font-mono text-2xl font-extralight tracking-tight">31.2 <span class="text-sm text-muted-foreground">mi</span></p>
						</div>
						<div class="bg-card px-4 py-3">
							<p class="font-mono text-[10px] text-muted-foreground uppercase">Saved</p>
							<p class="mt-0.5 font-mono text-2xl font-extralight tracking-tight text-landing-primary">-34%</p>
						</div>
						<div class="bg-card px-4 py-3">
							<p class="font-mono text-[10px] text-muted-foreground uppercase">Drivers</p>
							<p class="mt-0.5 font-mono text-2xl font-extralight tracking-tight">3</p>
						</div>
						<div class="bg-card px-4 py-3">
							<p class="font-mono text-[10px] text-muted-foreground uppercase">Time</p>
							<p class="mt-0.5 font-mono text-2xl font-extralight tracking-tight">2.4s</p>
						</div>
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
					<span class="font-mono text-xs font-bold text-muted-foreground">03</span>
					<h3 class="mt-2 font-serif text-3xl leading-tight tracking-tight">Dispatch to drivers</h3>
					<p class="mt-3 text-base leading-relaxed text-muted-foreground">
						Routes reach drivers instantly via SMS or email. Each gets a personalized
						link with turn-by-turn navigation in their preferred app.
					</p>
				</div>
				<!-- Vignette: Driver notification card -->
				<div class="mx-auto w-full max-w-xs">
					<div class="overflow-hidden rounded-sm border border-foreground/10 bg-card shadow-sm">
						<!-- Phone notification mockup -->
						<div class="bg-foreground/[0.03] px-4 py-3">
							<div class="flex items-center gap-2.5">
								<div class="flex h-8 w-8 items-center justify-center rounded-sm bg-landing-primary">
									<span class="text-xs font-bold text-landing-primary-foreground">W</span>
								</div>
								<div>
									<p class="text-xs font-semibold">Wend Routing</p>
									<p class="text-[10px] text-muted-foreground">Just now</p>
								</div>
							</div>
						</div>
						<div class="space-y-3 px-4 py-4">
							<p class="text-sm font-medium">New route assigned</p>
							<div class="space-y-1.5">
								<div class="flex justify-between text-xs">
									<span class="text-muted-foreground">Stops</span>
									<span class="font-mono font-medium">8</span>
								</div>
								<div class="flex justify-between text-xs">
									<span class="text-muted-foreground">Est. time</span>
									<span class="font-mono font-medium">2h 14m</span>
								</div>
								<div class="flex justify-between text-xs">
									<span class="text-muted-foreground">Distance</span>
									<span class="font-mono font-medium">18.3 mi</span>
								</div>
							</div>
							<button class="w-full rounded-sm bg-landing-primary py-2 text-xs font-medium text-landing-primary-foreground">
								Open in Google Maps
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
