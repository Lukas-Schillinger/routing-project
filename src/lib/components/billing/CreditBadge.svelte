<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import type { CreditBalance } from '$lib/schemas/billing';
	import Coins from '@lucide/svelte/icons/coins';
	import BillingModal from './BillingModal.svelte';

	type Props = {
		planSlug: 'free' | 'pro';
		credits: CreditBalance;
		monthlyCredits: number;
		onUpgrade?: () => void;
		onSuccess?: () => void;
	};

	let { planSlug, credits, monthlyCredits, onUpgrade, onSuccess }: Props =
		$props();

	let modalOpen = $state(false);

	const remainingPercentage = $derived(
		monthlyCredits > 0
			? Math.min(100, Math.round((credits.available / monthlyCredits) * 100))
			: 0
	);

	const colorClass = $derived.by(() => {
		if (remainingPercentage <= 0) return 'text-red-600';
		if (remainingPercentage <= 20) return 'text-yellow-600';
		return 'text-primary';
	});

	const strokeColor = $derived.by(() => {
		if (remainingPercentage <= 0) return '#dc2626';
		if (remainingPercentage <= 20) return '#ca8a04';
		return 'var(--primary)';
	});
</script>

<button type="button" onclick={() => (modalOpen = true)}>
	<div
		class="relative rounded-full p-0.5"
		style="background: conic-gradient(from 0deg, {strokeColor} {remainingPercentage}%, var(--muted) {remainingPercentage}%)"
	>
		<Badge
			variant="outline"
			class="relative cursor-pointer gap-0.5 bg-background px-2.5 py-1 text-sm font-medium tracking-tighter tabular-nums"
		>
			<Coins class="size-4 {colorClass}" />
			<span class={colorClass}>{credits.available.toLocaleString()}</span>
		</Badge>
	</div>
</button>

<BillingModal
	bind:open={modalOpen}
	{planSlug}
	{credits}
	{monthlyCredits}
	{onUpgrade}
	{onSuccess}
/>
