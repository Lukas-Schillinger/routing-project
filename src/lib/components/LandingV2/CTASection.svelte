<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ArrowRight } from 'lucide-svelte';
	import CloudflareImage from '../CloudflareImage.svelte';
</script>

<section class="px-4 pt-16 pb-32 md:px-8">
	<div class="mx-auto max-w-7xl">
		<div class="relative aspect-[3/4] overflow-hidden rounded-xl md:aspect-auto">
			<!-- Background Image -->
			<CloudflareImage
				class="absolute inset-0 h-full w-full object-cover md:relative md:h-auto md:w-full"
				src="https://storage-public.wend-routing.com/photos/illustrations/delivery-bay.png"
				alt="Three delivery trucks wait at a depot"
				size="2xl"
			/>

			<!-- Overlay Content - positioned over the top portion -->
			<div
				class="absolute inset-x-0 top-0 flex min-h-[60%] flex-col items-center justify-center px-6 py-16 text-center text-amber-400 md:px-12 md:py-24"
			>
				<!-- Eyebrow -->
				<p class="text-amber/70 mb-4 text-sm font-medium tracking-[0.2em] uppercase">
					Get started today
				</p>

				<!-- Headline -->
				<h2
					class="max-w-3xl font-serif text-4xl leading-tight tracking-tight md:text-5xl lg:text-6xl"
				>
					Ready to optimize your routes?
				</h2>

				<!-- Subtitle -->
				<p class="text-amber/80 mx-auto mt-6 max-w-xl text-base leading-relaxed md:text-lg">
					Join hundreds of delivery teams who save hours every day with intelligent route planning.
				</p>

				<!-- CTA Buttons -->
				<div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
					<Button
						href="/signup"
						size="lg"
						class="h-12 gap-2 bg-amber-400 px-8 text-forest-900 hover:bg-white/90"
					>
						Get started free
						<ArrowRight class="h-4 w-4" />
					</Button>
					<Button
						href="/contact"
						size="lg"
						class="h-12 border-white/20 bg-white/10 px-8 text-amber-400 backdrop-blur-sm hover:bg-white/20"
					>
						Talk to sales
					</Button>
				</div>
			</div>
		</div>
	</div>
</section>
