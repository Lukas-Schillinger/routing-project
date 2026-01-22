<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import type { CreditBalance } from '$lib/schemas/billing';
	import type { Plan } from '$lib/server/db/schema';
	import { CoinVertical } from 'phosphor-svelte';
	import BillingModal from './BillingModal.svelte';

	type Props = {
		plan: Plan;
		credits: CreditBalance;
		onUpgrade?: () => void;
		onSuccess?: () => void;
	};

	let { plan, credits, onUpgrade, onSuccess }: Props = $props();

	let modalOpen = $state(false);

	const used = $derived(plan.monthly_credits - credits.available);
	const usagePercentage = $derived(
		plan.monthly_credits > 0
			? Math.round((used / plan.monthly_credits) * 100)
			: 0
	);
	const remainingPercentage = $derived(
		plan.monthly_credits > 0
			? Math.min(
					100,
					Math.round((credits.available / plan.monthly_credits) * 100)
				)
			: 0
	);

	const colorClass = $derived.by(() => {
		if (usagePercentage >= 100) return 'text-red-600';
		if (usagePercentage >= 80) return 'text-yellow-600';
		return 'text-green-600';
	});

	const strokeColor = $derived.by(() => {
		if (usagePercentage >= 100) return '#dc2626';
		if (usagePercentage >= 80) return '#ca8a04';
		return '#16a34a';
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
			<CoinVertical class="size-4 {colorClass}" />
			<span class={colorClass}>{credits.available.toLocaleString()}</span>
		</Badge>
	</div>
</button>

<BillingModal bind:open={modalOpen} {plan} {credits} {onUpgrade} {onSuccess} />
