<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { ditheringFragmentShader, DitheringShapes, DitheringTypes } from '@paper-design/shaders';
	import { ArrowRight } from 'lucide-svelte';
	import { inView } from 'motion';
	import ShaderCanvas from './ShaderCanvas.svelte';

	const shaderUniforms = {
		u_colorBack: [0.024, 0.2, 0.155, 1.0],
		u_colorFront: [0.96, 0.94, 0.91, 0.25],
		u_shape: DitheringShapes.warp,
		u_type: DitheringTypes['8x8'],
		u_pxSize: 3,
		u_scale: 1.1,
		u_rotation: 0,
		u_originX: 0.5,
		u_originY: 0.5,
		u_offsetX: 0,
		u_offsetY: 0,
		u_worldWidth: 0,
		u_worldHeight: 0,
		u_fit: 0
	};

	let contentEl = $state<HTMLElement | null>(null);

	$effect(() => {
		if (!contentEl || !browser) return;
		return inView(
			contentEl,
			() => {
				contentEl!.style.opacity = '1';
				contentEl!.style.transform = 'translateY(0)';
			},
			{ amount: 0.3 }
		);
	});
</script>

<section class="relative overflow-hidden py-28 md:py-36">
	<ShaderCanvas fragmentShader={ditheringFragmentShader} uniforms={shaderUniforms} speed={0.15} />
	<div class="absolute inset-0 bg-forest-900/85"></div>

	<div
		bind:this={contentEl}
		class="relative mx-auto max-w-3xl px-2 text-center transition-all duration-700 ease-out sm:px-6 lg:px-8"
		style="opacity: 0; transform: translateY(20px)"
	>
		<p class="mb-4 text-xs font-medium tracking-[0.25em] text-landing-primary uppercase">
			Get started today
		</p>

		<h2 class="font-serif text-4xl leading-tight tracking-tight text-sand-50 md:text-6xl">
			Ready to optimize?
		</h2>

		<p class="mx-auto mt-5 max-w-md text-base leading-relaxed text-sand-300">
			Join delivery teams saving hours every day with intelligent route planning.
		</p>

		<div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
			<Button
				href={resolve('/auth/register')}
				size="lg"
				class="h-11 gap-2 rounded-sm bg-landing-primary px-8 text-sm font-medium tracking-wide text-landing-primary-foreground hover:bg-landing-primary-hover"
			>
				Start for free
				<ArrowRight class="h-4 w-4" />
			</Button>
			<Button
				href="mailto:hello@wend-routing.com"
				size="lg"
				class="h-11 rounded-sm border-white/15 bg-white/5 px-8 text-sm font-medium tracking-wide text-sand-100 hover:bg-white/10"
			>
				Talk to sales
			</Button>
		</div>
	</div>
</section>
