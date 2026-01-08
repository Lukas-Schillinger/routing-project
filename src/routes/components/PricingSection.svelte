<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Check } from 'lucide-svelte';

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
			cta: 'Start free trial'
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
			cta: 'Start free trial'
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
			cta: 'Contact sales'
		}
	];

	function getPrice(plan: (typeof plans)[0]) {
		return billingPeriod === 'annual' ? plan.annualPrice : plan.monthlyPrice;
	}
</script>

<section class="px-4 py-24 md:px-8 md:py-32">
	<div class="mx-auto max-w-5xl">
		<!-- Section Header -->
		<div class="mb-12 text-center">
			<p
				class="mb-4 text-sm font-medium tracking-[0.2em] text-landing-primary uppercase"
			>
				Pricing
			</p>
			<h2 class="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
				Simple, transparent pricing
			</h2>
			<p class="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
				Start free. Scale as you grow. No hidden fees.
			</p>
		</div>

		<!-- Billing Toggle -->
		<div class="mb-12 flex items-center justify-center">
			<div
				class="inline-flex items-center gap-1 rounded-full border border-foreground/10 bg-sand-50 p-1"
			>
				<button
					class="rounded-full px-4 py-2 text-sm font-medium transition-colors {billingPeriod ===
					'monthly'
						? 'bg-background text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => (billingPeriod = 'monthly')}
				>
					Monthly
				</button>
				<button
					class="rounded-full px-4 py-2 text-sm font-medium transition-colors {billingPeriod ===
					'annual'
						? 'bg-background text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => (billingPeriod = 'annual')}
				>
					Annual
					<span
						class="ml-1.5 rounded-full bg-landing-primary px-2 py-0.5 text-xs font-medium text-landing-primary-foreground"
					>
						-25%
					</span>
				</button>
			</div>
		</div>

		<!-- Pricing Cards -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
			{#each plans as plan}
				<div
					class="relative flex flex-col rounded-lg border bg-background p-8 {plan.highlighted
						? 'border-landing-primary shadow-lg shadow-landing-primary/10'
						: 'border-foreground/10'}"
				>
					{#if plan.highlighted}
						<span
							class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-landing-primary px-3 py-1 text-xs font-medium text-landing-primary-foreground"
						>
							Most popular
						</span>
					{/if}

					<div class="mb-6">
						<h3 class="text-lg font-semibold">{plan.name}</h3>
						<p class="mt-1 text-sm text-muted-foreground">
							{plan.description}
						</p>
					</div>

					<div class="mb-6">
						<span class="font-mono text-5xl font-medium tracking-tight"
							>${getPrice(plan)}</span
						>
						<span class="ml-1 text-sm text-muted-foreground">
							{plan.unit}
						</span>
					</div>

					<Button
						href={plan.cta === 'Contact sales' ? '/contact' : '/signup'}
						class="mb-8 w-full {plan.highlighted
							? 'bg-landing-primary text-landing-primary-foreground hover:bg-landing-primary-hover'
							: 'bg-foreground/5 text-foreground hover:bg-foreground/10'}"
					>
						{plan.cta}
					</Button>

					<ul class="mt-auto space-y-3">
						{#each plan.features as feature}
							<li class="flex items-start gap-3 text-sm">
								<Check class="mt-0.5 h-4 w-4 shrink-0 text-landing-primary" />
								<span class="text-muted-foreground">{feature}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<!-- Fine print -->
		<p class="mt-8 text-center text-sm text-muted-foreground">
			All plans include a 14-day free trial. No credit card required.
		</p>
	</div>
</section>
