<script lang="ts">
	import {
		CreditBadge,
		CreditPurchaseModal,
		OutOfCreditsModal,
		PlanCard
	} from '$lib/components/billing';
	import { Button } from '$lib/components/ui/button';

	let creditPurchaseModalOpen = $state(false);
	let outOfCreditsModalOpen = $state(false);

	function handleBuyCredits() {
		creditPurchaseModalOpen = true;
	}

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
				Displays credit balance with color-coded status. Click to see popover
				with details.
			</p>
		</div>

		<div class="grid gap-6 sm:grid-cols-2">
			<div class="space-y-2 rounded-lg border p-4">
				<p class="text-sm font-medium text-green-600">Green State (25% used)</p>
				<div class="flex items-center gap-2">
					<CreditBadge
						available={150}
						total={200}
						planName="Free"
						onBuyCredits={handleBuyCredits}
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
						available={40}
						total={200}
						planName="Free"
						onBuyCredits={handleBuyCredits}
						onUpgrade={handleUpgrade}
					/>
					<span class="text-sm text-muted-foreground">40/200 credits</span>
				</div>
			</div>

			<div class="space-y-2 rounded-lg border p-4">
				<p class="text-sm font-medium text-red-600">Red State (100% used)</p>
				<div class="flex items-center gap-2">
					<CreditBadge
						available={0}
						total={200}
						planName="Free"
						onBuyCredits={handleBuyCredits}
						onUpgrade={handleUpgrade}
					/>
					<span class="text-sm text-muted-foreground">0/200 credits</span>
				</div>
			</div>

			<div class="space-y-2 rounded-lg border p-4">
				<p class="text-sm font-medium">Pro Plan</p>
				<div class="flex items-center gap-2">
					<CreditBadge
						available={1800}
						total={2000}
						planName="Pro"
						onBuyCredits={handleBuyCredits}
						onUpgrade={handleUpgrade}
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
			<h2 class="text-xl font-semibold">Modal Triggers</h2>
			<p class="text-sm text-muted-foreground">
				Buttons to open billing-related modals for purchasing credits or
				handling insufficient balance.
			</p>
		</div>

		<div class="flex flex-wrap gap-4">
			<Button onclick={() => (creditPurchaseModalOpen = true)}>
				Open Credit Purchase Modal
			</Button>
			<Button
				variant="destructive"
				onclick={() => (outOfCreditsModalOpen = true)}
			>
				Open Out of Credits Modal
			</Button>
		</div>
	</section>
</div>

<CreditPurchaseModal bind:open={creditPurchaseModalOpen} />

<OutOfCreditsModal
	bind:open={outOfCreditsModalOpen}
	currentBalance={50}
	requiredCredits={150}
	onBuyCredits={() => {
		outOfCreditsModalOpen = false;
		creditPurchaseModalOpen = true;
	}}
	onUpgrade={handleUpgrade}
/>
