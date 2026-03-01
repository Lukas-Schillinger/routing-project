<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Check } from 'lucide-svelte';
	import { browser } from '$app/environment';
	import { inView } from 'motion';

	let billingPeriod = $state<'monthly' | 'annual'>('annual');

	const plans = [
		{
			name: 'Starter',
			description: 'For small teams getting started',
			monthlyPrice: 39,
			annualPrice: 29,
			unit: '/driver/mo',
			features: [
				'Up to 5 drivers',
				'50 stops per optimization',
				'Email support',
				'CSV import',
				'Basic analytics'
			],
			highlighted: false,
			cta: 'Start free trial',
			href: resolve('/auth/register')
		},
		{
			name: 'Professional',
			description: 'For growing delivery operations',
			monthlyPrice: 79,
			annualPrice: 59,
			unit: '/driver/mo',
			features: [
				'Up to 14 drivers',
				'100 stops per optimization',
				'Priority support',
				'API access',
				'Advanced analytics',
				'Custom branding'
			],
			highlighted: true,
			cta: 'Start free trial',
			href: resolve('/auth/register')
		},
		{
			name: 'Team',
			description: 'For enterprises with complex needs',
			monthlyPrice: 159,
			annualPrice: 119,
			unit: '/driver/mo',
			features: [
				'Unlimited drivers',
				'Unlimited stops',
				'Dedicated support',
				'SSO & SAML',
				'Custom integrations',
				'SLA guarantee'
			],
			highlighted: false,
			cta: 'Contact sales',
			href: 'mailto:hello@wend-routing.com'
		}
	];

	function getPrice(plan: (typeof plans)[0]) {
		return billingPeriod === 'annual' ? plan.annualPrice : plan.monthlyPrice;
	}

	let gridEl = $state<HTMLElement | null>(null);

	$effect(() => {
		if (!gridEl || !browser) return;
		return inView(
			gridEl,
			() => {
				const cards = gridEl!.querySelectorAll<HTMLElement>('[data-plan]');
				cards.forEach((card, i) => {
					setTimeout(() => {
						card.style.opacity = '1';
						card.style.transform = 'translateY(0)';
					}, i * 100);
				});
			},
			{ amount: 0.2 }
		);
	});
</script>

<section class="py-24 md:py-32">
	<div class="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
		<!-- Section Header -->
		<div class="mb-10 text-center">
			<p
				class="mb-3 text-xs font-medium tracking-[0.25em] text-landing-primary uppercase"
			>
				Pricing
			</p>
			<h2 class="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
				Simple, transparent pricing
			</h2>
			<p class="mx-auto mt-4 max-w-md text-base text-muted-foreground">
				Start free. Scale as you grow. No hidden fees.
			</p>
		</div>

		<!-- Billing Toggle -->
		<div class="mb-10 flex items-center justify-center">
			<div
				class="inline-flex items-center gap-0 overflow-hidden rounded-sm border border-foreground/10"
			>
				<button
					class="px-5 py-2.5 text-sm font-medium transition-colors duration-150
						{billingPeriod === 'monthly'
						? 'bg-foreground text-background'
						: 'bg-card text-muted-foreground hover:text-foreground'}"
					onclick={() => (billingPeriod = 'monthly')}
				>
					Monthly
				</button>
				<button
					class="flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors duration-150
						{billingPeriod === 'annual'
						? 'bg-foreground text-background'
						: 'bg-card text-muted-foreground hover:text-foreground'}"
					onclick={() => (billingPeriod = 'annual')}
				>
					Annual
					<span
						class="rounded-sm bg-landing-primary px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-landing-primary-foreground"
					>
						-25%
					</span>
				</button>
			</div>
		</div>

		<!-- Pricing Cards -->
		<div bind:this={gridEl} class="grid grid-cols-1 gap-5 md:grid-cols-3">
			{#each plans as plan (plan.name)}
				<div
					data-plan
					class="relative flex flex-col rounded-sm border p-7 transition-all duration-500 ease-out
						{plan.highlighted
						? 'border-landing-primary bg-card shadow-lg shadow-landing-primary/5'
						: 'border-foreground/10 bg-card'}"
					style="opacity: 0; transform: translateY(20px)"
				>
					{#if plan.highlighted}
						<div
							class="absolute -top-px right-5 rounded-b-sm bg-landing-primary px-3 py-1 text-[10px] font-bold tracking-wide text-landing-primary-foreground uppercase"
						>
							Popular
						</div>
					{/if}

					<div class="mb-5">
						<h3 class="text-base font-semibold">{plan.name}</h3>
						<p class="mt-1 text-sm text-muted-foreground">{plan.description}</p>
					</div>

					<div class="mb-5">
						<span class="font-mono text-4xl font-extralight tracking-tight"
							>${getPrice(plan)}</span
						>
						<span class="ml-1 text-sm text-muted-foreground">{plan.unit}</span>
					</div>

					<Button
						href={plan.href}
						variant={plan.highlighted ? 'landing' : undefined}
						class="mb-6 w-full rounded-sm {plan.highlighted
							? ''
							: 'bg-foreground/5 text-foreground hover:bg-foreground/10'}"
					>
						{plan.cta}
					</Button>

					<ul class="mt-auto space-y-2.5">
						{#each plan.features as feature (feature)}
							<li class="flex items-start gap-2.5 text-sm">
								<Check
									class="mt-0.5 h-3.5 w-3.5 shrink-0 text-landing-primary"
								/>
								<span class="text-muted-foreground">{feature}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<p class="mt-6 text-center text-xs text-muted-foreground">
			All plans include a 14-day free trial. No credit card required.
		</p>
	</div>
</section>
