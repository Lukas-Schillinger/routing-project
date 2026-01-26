<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as InputGroup from '$lib/components/ui/input-group';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import { billingApi } from '$lib/services/api/billing';
	import { page } from '$app/stores';

	type Props = {
		open: boolean;
		currentBalance: number;
		onSuccess?: () => void;
	};

	let { open = $bindable(false), currentBalance, onSuccess }: Props = $props();

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
	const newBalance = $derived(currentBalance + creditAmount);

	async function handlePurchase() {
		if (creditAmount < 100) {
			error = 'Minimum purchase is 100 credits';
			return;
		}

		error = null;
		isLoading = true;

		try {
			const response = await billingApi.createCreditsCheckout({
				amount: creditAmount,
				returnUrl: $page.url.pathname
			});
			window.location.href = response.url;
			onSuccess?.();
		} catch (e) {
			error =
				e instanceof Error ? e.message : 'Failed to create checkout session';
			isLoading = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Purchase Credits</Dialog.Title>
			<Dialog.Description>
				You have {currentBalance.toLocaleString()} credits. Purchase more at $0.01
				per credit.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
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
					<Spinner class="mr-2" />
					Processing...
				{:else}
					Purchase Credits
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
