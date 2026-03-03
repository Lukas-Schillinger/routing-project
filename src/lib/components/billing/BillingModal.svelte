<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as InputGroup from '$lib/components/ui/input-group';
	import { Button } from '$lib/components/ui/button';
	import CreditProgressBar from './CreditProgressBar.svelte';
	import { Spinner } from '$lib/components/ui/spinner';
	import { billingApi } from '$lib/services/api/billing';
	import type { CreditBalance } from '$lib/schemas/billing';
	import { Check, RocketLaunch } from 'phosphor-svelte';
	import { page } from '$app/state';

	type Props = {
		open: boolean;
		planSlug: 'free' | 'pro';
		credits: CreditBalance;
		monthlyCredits: number;
		onUpgrade?: () => void;
		onSuccess?: () => void;
	};

	let {
		open = $bindable(false),
		planSlug,
		credits,
		monthlyCredits,
		onUpgrade,
		onSuccess
	}: Props = $props();

	const isFreePlan = $derived(planSlug === 'free');
	let showPurchaseCredits = $state(false);

	// Reset state when modal closes
	$effect(() => {
		if (!open) showPurchaseCredits = false;
	});

	// Credit remaining calculations
	const remainingPercentage = $derived(
		monthlyCredits > 0
			? Math.round((credits.available / monthlyCredits) * 100)
			: 0
	);

	const statusColorClass = $derived.by(() => {
		if (remainingPercentage <= 0) return 'text-red-600';
		if (remainingPercentage <= 20) return 'text-yellow-600';
		return 'text-primary';
	});

	// Credit purchase state
	let creditAmount = $state(100);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	const price = $derived(creditAmount * 0.01);
	const formattedPrice = $derived(
		price.toLocaleString('en-US', {
			style: 'currency',
			currency: 'USD'
		})
	);
	const newBalance = $derived(credits.available + creditAmount);

	const proFeatures = [
		'2,000 monthly credits included',
		'Priority route optimization',
		'Advanced analytics & reporting',
		'Email support'
	];

	async function handleUpgrade() {
		if (onUpgrade) {
			onUpgrade();
			return;
		}
		isLoading = true;
		try {
			const url = await billingApi.createUpgradeCheckout();
			window.location.href = url;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to start upgrade';
			isLoading = false;
		}
	}

	async function handlePurchase() {
		if (creditAmount < 100) {
			error = 'Minimum purchase is 100 credits';
			return;
		}

		error = null;
		isLoading = true;

		try {
			const url = await billingApi.createCreditsCheckout({
				amount: creditAmount,
				returnUrl: page.url.pathname
			});
			window.location.href = url;
			onSuccess?.();
		} catch (e) {
			error =
				e instanceof Error ? e.message : 'Failed to create checkout session';
			isLoading = false;
		}
	}
</script>

{#snippet creditProgress()}
	<div class="space-y-2 rounded-lg bg-muted/50 p-4">
		<div class="flex items-center justify-between text-sm">
			<span class="font-medium">Credits</span>
			<span class={statusColorClass}>
				{credits.available.toLocaleString()} / {monthlyCredits.toLocaleString()}
			</span>
		</div>
		<CreditProgressBar
			available={credits.available}
			{monthlyCredits}
			showCount={false}
			showPercentageLabel
		/>
	</div>
{/snippet}

<Dialog.Root bind:open>
	{#if isFreePlan && !showPurchaseCredits}
		<Dialog.Content class="sm:max-w-lg">
			<Dialog.Header class="text-center">
				<Dialog.Title class="text-2xl">Get More Credits</Dialog.Title>
				<Dialog.Description>
					Upgrade to Pro for more monthly credits or purchase credits à la
					carte.
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4 py-4">
				{@render creditProgress()}

				<div class="rounded-xl border bg-card p-6">
					<div class="mb-4 flex items-start justify-between">
						<div
							class="flex size-12 items-center justify-center rounded-lg bg-primary/10"
						>
							<RocketLaunch class="size-6 text-primary" weight="duotone" />
						</div>
					</div>

					<h3 class="text-xl font-semibold">Pro</h3>
					<p class="mt-1 text-sm text-muted-foreground">
						For teams that need more power
					</p>

					<div class="mt-4 flex items-baseline gap-1">
						<span class="text-3xl font-bold">$49</span>
						<span class="text-muted-foreground">/ month</span>
					</div>

					<Button
						class="mt-4 w-full"
						onclick={handleUpgrade}
						disabled={isLoading}
					>
						Upgrade to Pro
					</Button>

					<div class="mt-6 border-t pt-4">
						<p class="mb-3 text-sm font-medium">Everything in Free, plus:</p>
						<ul class="space-y-2">
							{#each proFeatures as feature (feature)}
								<li
									class="flex items-center gap-2 text-sm text-muted-foreground"
								>
									<Check class="size-4 text-green-600" weight="bold" />
									{feature}
								</li>
							{/each}
						</ul>
					</div>
				</div>
			</div>

			<div class="flex items-center justify-center border-t pt-4">
				<button
					class="text-sm text-muted-foreground underline-offset-4 hover:underline"
					onclick={() => (showPurchaseCredits = true)}
				>
					Buy credits instead
				</button>
			</div>
		</Dialog.Content>
	{:else}
		<Dialog.Content class="sm:max-w-md">
			<Dialog.Header>
				<Dialog.Title>Purchase Credits</Dialog.Title>
				<Dialog.Description>
					Add more credits to your account at $0.01 per credit.
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4 py-4">
				{@render creditProgress()}

				<div class="space-y-2">
					<label for="credit-amount" class="text-sm font-medium">
						Number of Credits
					</label>
					<InputGroup.Root>
						<InputGroup.Input
							id="credit-amount"
							type="number"
							min={100}
							step={100}
							bind:value={creditAmount}
							disabled={isLoading}
						/>
					</InputGroup.Root>
					<p class="text-sm text-muted-foreground">
						Minimum purchase: 100 credits
					</p>
				</div>

				<div class="space-y-2 rounded-lg bg-muted p-4">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium">Total Price</span>
						<span class="text-lg font-semibold">{formattedPrice}</span>
					</div>
					<div
						class="flex items-center justify-between text-sm text-muted-foreground"
					>
						<span>New Balance</span>
						<span>{newBalance.toLocaleString()} credits</span>
					</div>
				</div>

				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
			</div>

			<Dialog.Footer>
				<Button
					variant="outline"
					onclick={() => (open = false)}
					disabled={isLoading}
				>
					Cancel
				</Button>
				<Button
					onclick={handlePurchase}
					disabled={isLoading || creditAmount < 100}
				>
					{#if isLoading}
						<Spinner />
						Processing...
					{:else}
						Purchase Credits
					{/if}
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	{/if}
</Dialog.Root>
