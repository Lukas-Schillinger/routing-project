<script lang="ts">
	import { browser } from '$app/environment';
	import { inView } from 'motion';
	import { SvelteSet } from 'svelte/reactivity';
	import { ChevronDown, Clock, MapPin, Plus, Truck } from 'lucide-svelte';

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
	let containerEl = $state<HTMLElement | null>(null);

	$effect(() => {
		if (!containerEl || !browser) return;
		return inView(
			containerEl,
			() => {
				containerEl!.style.opacity = '1';
				containerEl!.style.transform = 'translateY(0)';
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
	<div>
		<span class="font-mono text-xs font-bold text-muted-foreground">03</span>
		<h3 class="mt-2 font-serif text-3xl leading-tight tracking-tight">
			Dispatch to drivers
		</h3>
		<p class="mt-3 text-base leading-relaxed text-muted-foreground">
			Routes reach drivers instantly via SMS or email. Each gets a personalized
			link with turn-by-turn navigation in their preferred app.
		</p>
	</div>
	<!-- Vignette: Driver list -->
	<div class="overflow-hidden rounded-lg border border-foreground/10 bg-card">
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
					class="rounded-lg {isExpanded ? 'border border-foreground/10' : ''}"
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
						<div class="border-t border-foreground/5 px-2.5 pt-1.5 pb-2.5">
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
