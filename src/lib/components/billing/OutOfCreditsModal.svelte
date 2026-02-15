<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { billingApi } from '$lib/services/api/billing';
	import type { PlanSlug } from '$lib/config/billing';
	import { Check, RocketLaunch } from 'phosphor-svelte';

	type Props = {
		open: boolean;
		currentBalance: number;
		planSlug: PlanSlug;
		onBuyCredits?: () => void;
		onUpgrade?: () => void;
	};

	let {
		open = $bindable(false),
		currentBalance,
		planSlug,
		onBuyCredits,
		onUpgrade
	}: Props = $props();

	let isUpgrading = $state(false);

	const isFreePlan = $derived(planSlug === 'free');

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
		isUpgrading = true;
		try {
			const response = await billingApi.createUpgradeCheckout();
			window.location.href = response.url;
		} catch {
			isUpgrading = false;
		}
	}
</script>

<Dialog.Root bind:open>
	{#if isFreePlan}
		<Dialog.Content class="sm:max-w-lg">
			<Dialog.Header class="text-center">
				<Dialog.Title class="text-2xl">You're out of credits</Dialog.Title>
				<Dialog.Description>
					You have {currentBalance} credits remaining. Upgrade to Pro or purchase
					more credits.
				</Dialog.Description>
			</Dialog.Header>

			<div class="py-4">
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
						disabled={isUpgrading}
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
					onclick={() => onBuyCredits?.()}
				>
					Or buy credits instead
				</button>
			</div>
		</Dialog.Content>
	{:else}
		<Dialog.Content class="sm:max-w-[425px]">
			<Dialog.Header>
				<Dialog.Title>Out of Credits</Dialog.Title>
				<Dialog.Description>
					You have {currentBalance} credits remaining. Purchase more credits to continue
					using optimizations.
				</Dialog.Description>
			</Dialog.Header>

			<Dialog.Footer>
				<Button onclick={() => onBuyCredits?.()}>Buy Credits</Button>
			</Dialog.Footer>
		</Dialog.Content>
	{/if}
</Dialog.Root>
