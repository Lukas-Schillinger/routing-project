<script lang="ts">
	import { BillingModal, CreditBadge, PlanCard } from '$lib/components/billing';
	import { Button } from '$lib/components/ui/button';
	import type { CreditBalance } from '$lib/schemas/billing';

	// Mock credit balances for different states
	const creditsGreen: CreditBalance = { available: 150 };
	const creditsYellow: CreditBalance = { available: 40 };
	const creditsRed: CreditBalance = { available: 0 };
	const creditsPro: CreditBalance = { available: 1800 };

	let billingModalFreeOpen = $state(false);
	let billingModalProOpen = $state(false);

	function handleUpgrade() {
		console.log('Upgrade clicked');
	}

	function handleManageSubscription() {
		console.log('Manage subscription clicked');
	}
</script>

<div class="container max-w-4xl space-y-12 py-8">
	<div class="space-y-2">
		<h1 class="text-3xl font-bold">Billing Components Demo</h1>
		<p class="text-muted-foreground">
			Interactive examples of billing-related components used throughout the
			application.
		</p>
	</div>

	<!-- CreditBadge Section -->
	<section class="space-y-6">
		<div class="space-y-1">
			<h2 class="text-xl font-semibold">CreditBadge</h2>
			<p class="text-sm text-muted-foreground">
				Displays credit balance with color-coded status. Click to open the
				billing modal.
			</p>
		</div>

		<div class="grid gap-6 sm:grid-cols-2">
			<div class="space-y-2 rounded-lg border p-4">
				<p class="text-sm font-medium text-green-600">Green State (25% used)</p>
				<div class="flex items-center gap-2">
					<CreditBadge
						planSlug="free"
						credits={creditsGreen}
						monthlyCredits={200}
						onUpgrade={handleUpgrade}
					/>
					<span class="text-sm text-muted-foreground">150/200 credits</span>
				</div>
			</div>

			<div class="space-y-2 rounded-lg border p-4">
				<p class="text-sm font-medium text-yellow-600">
					Yellow State (80% used)
				</p>
				<div class="flex items-center gap-2">
					<CreditBadge
						planSlug="free"
						credits={creditsYellow}
						monthlyCredits={200}
						onUpgrade={handleUpgrade}
					/>
					<span class="text-sm text-muted-foreground">40/200 credits</span>
				</div>
			</div>

			<div class="space-y-2 rounded-lg border p-4">
				<p class="text-sm font-medium text-red-600">Red State (100% used)</p>
				<div class="flex items-center gap-2">
					<CreditBadge
						planSlug="free"
						credits={creditsRed}
						monthlyCredits={200}
						onUpgrade={handleUpgrade}
					/>
					<span class="text-sm text-muted-foreground">0/200 credits</span>
				</div>
			</div>

			<div class="space-y-2 rounded-lg border p-4">
				<p class="text-sm font-medium">Pro Plan</p>
				<div class="flex items-center gap-2">
					<CreditBadge
						planSlug="pro"
						credits={creditsPro}
						monthlyCredits={2000}
					/>
					<span class="text-sm text-muted-foreground">1,800/2,000 credits</span>
				</div>
			</div>
		</div>
	</section>

	<!-- PlanCard Section -->
	<section class="space-y-6">
		<div class="space-y-1">
			<h2 class="text-xl font-semibold">PlanCard</h2>
			<p class="text-sm text-muted-foreground">
				Displays subscription plan information with renewal date and management
				options.
			</p>
		</div>

		<div class="grid gap-6 sm:grid-cols-2">
			<div class="space-y-2">
				<p class="text-sm font-medium">Free Plan</p>
				<PlanCard
					planName="free"
					displayName="Free"
					price={0}
					renewalDate={new Date('2026-02-19')}
					onManage={handleManageSubscription}
				/>
			</div>

			<div class="space-y-2">
				<p class="text-sm font-medium">Pro Plan (Downgrade Scheduled)</p>
				<PlanCard
					planName="pro"
					displayName="Pro"
					price={49}
					renewalDate={new Date('2026-02-19')}
					isScheduledDowngrade={true}
					onManage={handleManageSubscription}
				/>
			</div>
		</div>
	</section>

	<!-- Modal Triggers Section -->
	<section class="space-y-6">
		<div class="space-y-1">
			<h2 class="text-xl font-semibold">BillingModal</h2>
			<p class="text-sm text-muted-foreground">
				Unified billing modal that shows upgrade options for Free users and
				credit purchase for Pro users.
			</p>
		</div>

		<div class="flex flex-wrap gap-4">
			<Button onclick={() => (billingModalFreeOpen = true)}>
				Open Billing Modal (Free Plan)
			</Button>
			<Button variant="outline" onclick={() => (billingModalProOpen = true)}>
				Open Billing Modal (Pro Plan)
			</Button>
		</div>
	</section>
</div>

<BillingModal
	bind:open={billingModalFreeOpen}
	planSlug="free"
	credits={creditsYellow}
	monthlyCredits={200}
	onUpgrade={handleUpgrade}
/>

<BillingModal
	bind:open={billingModalProOpen}
	planSlug="pro"
	credits={creditsPro}
	monthlyCredits={2000}
/>
