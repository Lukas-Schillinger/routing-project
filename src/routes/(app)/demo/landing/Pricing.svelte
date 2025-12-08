<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Check } from 'phosphor-svelte';

	let pricingPeriod = $state<'annual' | 'monthly'>('annual');

	const plans = [
		{
			name: 'Starter',
			priceMonthly: '$0',
			priceAnnual: '$0',
			buttonText: 'get started',
			features: ['up to 3 users', '1500 stops', '10 optimizations']
		},
		{
			name: 'Business',
			priceMonthly: '$8',
			priceAnnual: '$6',
			buttonText: 'get started',
			features: ['up to 100 users', 'unlimited stops', 'unlimited optimizations']
		},
		{
			name: 'Enterprise',
			priceMonthly: 'variable',
			priceAnnual: 'variable',
			buttonText: 'contact',
			features: [
				'everything in professional',
				'priority support',
				'white-label options',
				'custom contracts'
			]
		}
	];
</script>

<div class="pb-8 text-center text-8xl font-medium">plans & pricing</div>
<div class="flex justify-center pb-12">
	<Tabs.Root bind:value={pricingPeriod} class="">
		<Tabs.List>
			<Tabs.Trigger class="w-56" value="annual">Annual</Tabs.Trigger>
			<Tabs.Trigger value="monthly">Monthly</Tabs.Trigger>
		</Tabs.List>
	</Tabs.Root>
</div>
<div class="bg-texture border">
	<div class="grid gap-6 px-6 sm:grid-cols-3">
		{#each plans as plan, index}
			<div class="border-x bg-background p-6 even:bg-foreground even:text-primary-foreground">
				<div class="font-serif text-4xl">{plan.name}</div>
				<div class="pt-18 pb-12">
					<span class="text-6xl">
						{pricingPeriod == 'annual' ? plan.priceAnnual : plan.priceMonthly}
					</span>
					<div class="text-muted-foreground">
						per {pricingPeriod == 'annual' ? 'year' : 'month'}, per user
					</div>
				</div>
				<div>
					<Button size="sm" class="w-full {index % 2 === 1 ? 'bg-background text-foreground' : ''}"
						>{plan.buttonText}</Button
					>
				</div>
				<div class="pt-8">
					<ul class="">
						{#each plan.features as feature}
							<li class="flex items-center gap-2 py-1"><Check class="shrink-0" /> {feature}</li>
						{/each}
					</ul>
				</div>
			</div>
		{/each}
	</div>
</div>
