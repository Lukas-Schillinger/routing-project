<script lang="ts">
	import { resolve } from '$app/paths';
	import { scrollReveal } from '$lib/actions/scroll-reveal';
	import { Button } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import Check from '@lucide/svelte/icons/check';

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
			<Tabs.Root bind:value={billingPeriod}>
				<Tabs.List
					class="h-auto gap-0 overflow-hidden rounded-lg border border-foreground/10 bg-card p-0"
				>
					<Tabs.Trigger
						value="monthly"
						class="h-auto rounded-none px-5 py-2.5 text-sm font-medium data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-none"
					>
						Monthly
					</Tabs.Trigger>
					<Tabs.Trigger
						value="annual"
						class="h-auto rounded-none px-5 py-2.5 text-sm font-medium data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-none"
					>
						Annual
						<span
							class="rounded-sm bg-landing-primary px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-landing-primary-foreground"
							>-25%</span
						>
					</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>
		</div>

		<!-- Pricing Cards -->
		<div
			use:scrollReveal={{
				stagger: 100,
				duration: 500,
				selector: '[data-plan]'
			}}
			class="grid grid-cols-1 gap-5 md:grid-cols-3"
		>
			{#each plans as plan (plan.name)}
				<div
					data-plan
					class="relative flex flex-col rounded-lg border p-7
						{plan.highlighted
						? 'border-landing-primary bg-card shadow-lg shadow-landing-primary/5'
						: 'border-foreground/10 bg-card'}"
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
