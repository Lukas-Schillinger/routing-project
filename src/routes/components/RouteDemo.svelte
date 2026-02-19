<script lang="ts">
	import { browser } from '$app/environment';
	import { inView } from 'motion';

	let containerEl = $state<HTMLDivElement | null>(null);

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

<section class="py-20 md:py-28">
	<div class="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
		<div
			bind:this={containerEl}
			class="mx-auto max-w-2xl text-center transition-all duration-700 ease-out"
			style="opacity: 0; transform: translateY(30px)"
		>
			<p
				class="mb-3 text-xs font-medium tracking-[0.25em] text-landing-primary uppercase"
			>
				The problem
			</p>
			<h2 class="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
				Manual routing breaks at scale
			</h2>
			<p class="mt-4 text-base leading-relaxed text-muted-foreground">
				Twenty stops, three drivers, billions of possible combinations. Finding
				the shortest set of routes is NP-hard — there is no shortcut, only
				better heuristics.
			</p>
		</div>
	</div>
</section>
