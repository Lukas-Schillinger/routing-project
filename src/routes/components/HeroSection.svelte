<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ArrowRight } from 'lucide-svelte';
</script>

<section class="px-4 pt-32 pb-24 md:px-8 md:pt-40 md:pb-32">
	<div class="mx-auto max-w-4xl text-center">
		<!-- Eyebrow -->
		<p class="mb-6 text-sm font-medium tracking-[0.2em] text-landing-primary uppercase">
			Route Optimization
		</p>

		<!-- Headline -->
		<h1 class="font-serif text-5xl leading-[1.1] tracking-tight text-foreground md:text-7xl">
			Effortless routes from
			<br class="hidden sm:block" />
			start to finish
		</h1>

		<!-- Subtitle -->
		<p class="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
			Plan, optimize, and dispatch routes for your entire fleet in seconds. Built for teams who
			deliver.
		</p>

		<!-- CTA Buttons -->
		<div class="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
			<Button
				href="/signup"
				size="lg"
				class="h-12 gap-2 bg-landing-primary px-8 hover:bg-landing-primary-hover"
			>
				Start for free
				<ArrowRight class="h-4 w-4" />
			</Button>
			<Button href="/demo" variant="outline" size="lg" class="h-12 px-8">See how it works</Button>
		</div>
	</div>
</section>
