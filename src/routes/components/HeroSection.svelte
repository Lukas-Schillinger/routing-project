<script lang="ts">
	import { resolve } from '$app/paths';
	import { scrollReveal } from '$lib/actions/scroll-reveal';
	import { Button } from '$lib/components/ui/button';
	import {
		ditheringFragmentShader,
		DitheringShapes,
		DitheringTypes
	} from '@paper-design/shaders';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { mode } from 'mode-watcher';
	import ShaderCanvas from './ShaderCanvas.svelte';

	const shaderUniforms = $derived({
		u_colorBack:
			mode.current === 'dark'
				? [0.039, 0.039, 0.039, 1.0]
				: [1.0, 0.984, 0.957, 1.0],
		u_colorFront:
			mode.current === 'dark'
				? [0.85, 0.65, 0.2, 0.3]
				: [0.059, 0.31, 0.267, 0.3],
		u_shape: DitheringShapes.warp,
		u_type: DitheringTypes['2x2'],
		u_pxSize: 4,
		u_scale: 1.4,
		u_rotation: 0,
		u_originX: 0.5,
		u_originY: 0.5,
		u_offsetX: 0.5,
		u_offsetY: 0,
		u_worldWidth: 0,
		u_worldHeight: 0,
		u_fit: 0
	});
</script>

<section class="relative -mt-14 overflow-hidden pt-44 pb-44 md:pt-60 md:pb-60">
	<ShaderCanvas
		fragmentShader={ditheringFragmentShader}
		uniforms={shaderUniforms}
		speed={0.2}
	/>

	<div
		use:scrollReveal={{
			stagger: 120,
			delay: 200,
			selector: '[data-animate]',
			duration: 600
		}}
		class="relative mx-auto max-w-7xl px-2 sm:px-6 lg:px-8"
	>
		<p
			data-animate
			class="mb-5 text-xs font-medium tracking-[0.25em] text-landing-primary uppercase"
		>
			Route Optimization
		</p>

		<h1
			data-animate
			class="max-w-5xl font-serif text-6xl leading-[1.05] tracking-tight text-foreground md:text-8xl lg:text-9xl"
		>
			Effortless routing<br />from start to finish
		</h1>

		<p
			data-animate
			class="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
		>
			Plan, optimize, and dispatch routes for your entire fleet in seconds.
			Fewer miles. Faster deliveries. Less wasted time.
		</p>

		<div data-animate class="mt-10 flex items-center gap-4">
			<Button
				href={resolve('/auth/register')}
				variant="landing"
				size="lg"
				class="h-11 gap-2 rounded-sm px-7 text-sm tracking-wide"
			>
				Start for free
				<ArrowRight class="h-4 w-4" />
			</Button>
			<Button
				variant="outline"
				size="lg"
				disabled
				class="h-11 gap-2 rounded-sm px-7 text-sm font-medium tracking-wide"
			>
				Explore demo
				<span
					class="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground"
					>soon</span
				>
			</Button>
		</div>
	</div>
</section>
