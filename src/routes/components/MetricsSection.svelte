<script lang="ts">
	const metrics = [
		{
			value: '23%',
			label: 'shorter routes',
			description:
				'Average reduction in total driving distance compared to manual planning'
		},
		{
			value: '14',
			label: 'drivers per route',
			description: 'Assign up to 14 drivers per route with balanced stops'
		},
		{
			value: '100',
			label: 'stops optimized',
			description:
				'Handle up to 100 delivery stops across 14 drivers in one optimization'
		},
		{
			value: '< 5s',
			label: 'to optimize',
			description:
				'Routes calculated in seconds, not minutes—ready when you are'
		}
	];
</script>

<section class="py-24">
	<div class="mx-auto">
		<!-- Section Header -->
		<div class="mb-16 text-center">
			<p
				class="mb-4 text-sm font-medium tracking-[0.2em] text-landing-primary uppercase"
			>
				The impact
			</p>
			<h2 class="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
				Results that speak for themselves
			</h2>
		</div>

		<!-- Metrics Grid -->
		<div class="bg-texture flex w-full justify-center p-4 sm:p-8">
			<div
				class="grid max-w-7xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4"
			>
				{#each metrics as metric}
					<div class="rounded-lg border border-foreground/5 bg-background p-8">
						<p
							class="font-mono text-5xl font-medium tracking-tight text-landing-primary"
						>
							{metric.value}
						</p>
						<p class="mt-2 text-lg font-semibold tracking-tight">
							{metric.label}
						</p>
						<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
							{metric.description}
						</p>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>
