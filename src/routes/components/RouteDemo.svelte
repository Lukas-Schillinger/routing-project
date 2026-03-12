<script lang="ts">
	import { scrollReveal } from '$lib/actions/scroll-reveal';
</script>

<section class="py-20 md:py-28">
	<div class="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
		<div use:scrollReveal={{ y: 30 }} class="mx-auto max-w-2xl text-center">
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
