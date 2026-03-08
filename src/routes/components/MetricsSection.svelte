<script lang="ts">
	import { scrollReveal } from '$lib/actions/scroll-reveal';
	import {
		grainGradientFragmentShader,
		GrainGradientShapes,
		ShaderFitOptions
	} from '@paper-design/shaders';
	import ShaderCanvas from './ShaderCanvas.svelte';

	type MetricConfig = {
		value: string;
		label: string;
		description: string;
		from: number;
		to: number;
		prefix: string;
		suffix: string;
	};

	const metrics: MetricConfig[] = [
		{
			value: '200M+',
			label: 'routes evaluated',
			description:
				'Permutations tested per optimization to find the shortest path',
			from: 0,
			to: 200,
			prefix: '',
			suffix: 'M+'
		},
		{
			value: '< 3s',
			label: 'solve time',
			description:
				'Full fleet optimization including distance matrix computation',
			from: 10,
			to: 3,
			prefix: '< ',
			suffix: 's'
		},
		{
			value: '100',
			label: 'stops per run',
			description: 'Delivery stops handled in a single optimization',
			from: 0,
			to: 100,
			prefix: '',
			suffix: ''
		},
		{
			value: '14',
			label: 'concurrent drivers',
			description: 'Routes split and balanced across your entire fleet',
			from: 0,
			to: 14,
			prefix: '',
			suffix: ''
		}
	];

	const shaderUniforms = {
		u_colorBack: [0.04, 0.2, 0.17, 1.0],
		u_colors: [
			[0.059, 0.31, 0.267, 1.0],
			[0.043, 0.23, 0.2, 1.0],
			[0.02, 0.15, 0.13, 1.0]
		],
		u_colorsCount: 3,
		u_softness: 0.7,
		u_intensity: 0.3,
		u_noise: 0.4,
		u_shape: GrainGradientShapes.wave,
		u_scale: 1,
		u_rotation: 0,
		u_originX: 0.5,
		u_originY: 0.5,
		u_offsetX: 0,
		u_offsetY: 0,
		u_worldWidth: 0,
		u_worldHeight: 0,
		u_fit: ShaderFitOptions.none
	};

	const ANIMATION_DURATION = 1500;
	const STAGGER_DELAY = 100;

	function easeOutCubic(t: number): number {
		return 1 - Math.pow(1 - t, 3);
	}

	let displayValues = $state<string[]>(
		metrics.map((m) => `${m.prefix}${m.from}${m.suffix}`)
	);
	let hasAnimated = $state(false);

	function animateCounter(index: number) {
		const metric = metrics[index];
		const startTime = performance.now();

		function tick(now: number) {
			const elapsed = now - startTime;
			const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
			const easedProgress = easeOutCubic(progress);

			const currentValue = Math.round(
				metric.from + (metric.to - metric.from) * easedProgress
			);
			displayValues[index] = `${metric.prefix}${currentValue}${metric.suffix}`;

			if (progress < 1) {
				requestAnimationFrame(tick);
			} else {
				displayValues[index] = metric.value;
			}
		}

		requestAnimationFrame(tick);
	}
</script>

<section class="relative overflow-hidden py-24 md:py-32">
	<ShaderCanvas
		fragmentShader={grainGradientFragmentShader}
		uniforms={shaderUniforms}
		speed={0.15}
		class="opacity-60"
	/>
	<div class="absolute inset-0 bg-forest-900/80"></div>

	<div class="relative mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
		<div class="mb-12">
			<p
				class="mb-3 text-xs font-medium tracking-[0.25em] text-landing-secondary uppercase dark:text-landing-primary"
			>
				The numbers
			</p>
			<h2
				class="max-w-md font-serif text-4xl leading-tight tracking-tight text-sand-50 md:text-5xl"
			>
				Results that speak for themselves
			</h2>
		</div>

		<div
			use:scrollReveal={{
				y: 12,
				stagger: 80,
				selector: '[data-metric]',
				amount: 0.25,
				onEnter: () => {
					if (!hasAnimated) {
						hasAnimated = true;
						metrics.forEach((_, i) => {
							setTimeout(() => animateCounter(i), i * STAGGER_DELAY);
						});
					}
				}
			}}
			class="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 lg:grid-cols-4"
		>
			{#each metrics as metric, i (metric.label)}
				<div
					data-metric
					class="bg-forest-900/60 p-6 backdrop-blur-sm transition-all duration-500 ease-out"
				>
					<p
						class="font-mono text-4xl font-extralight tracking-tight text-sand-50 md:text-5xl"
					>
						{displayValues[i]}
					</p>
					<p class="mt-2 text-sm font-bold tracking-tight text-sand-100">
						{metric.label}
					</p>
					<p class="mt-1.5 text-xs leading-relaxed text-sand-300">
						{metric.description}
					</p>
				</div>
			{/each}
		</div>
	</div>
</section>
