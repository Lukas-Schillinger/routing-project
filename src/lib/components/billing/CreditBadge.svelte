<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import { Progress } from '$lib/components/ui/progress';
	import { CoinVertical } from 'phosphor-svelte';

	type Props = {
		available: number;
		total: number;
		planName: string;
		onBuyCredits?: () => void;
		onUpgrade?: () => void;
	};

	let { available, total, planName, onBuyCredits, onUpgrade }: Props = $props();

	const used = $derived(total - available);
	const usagePercentage = $derived(
		total > 0 ? Math.round((used / total) * 100) : 0
	);

	const colorClass = $derived.by(() => {
		if (usagePercentage >= 100) return 'text-red-600';
		if (usagePercentage >= 80) return 'text-yellow-600';
		return 'text-green-600';
	});

	const progressColorClass = $derived.by(() => {
		if (usagePercentage >= 100)
			return '[&_[data-slot=progress-indicator]]:bg-red-600';
		if (usagePercentage >= 80)
			return '[&_[data-slot=progress-indicator]]:bg-yellow-600';
		return '[&_[data-slot=progress-indicator]]:bg-green-600';
	});
</script>

<Popover.Root>
	<Popover.Trigger>
		<Badge
			variant="outline"
			class="cursor-pointer gap-1.5 px-2.5 py-1 text-base"
		>
			<CoinVertical class="size-5 {colorClass}" />
			<span class={colorClass}>{available.toLocaleString()}</span>
		</Badge>
	</Popover.Trigger>
	<Popover.Content align="end" class="w-64">
		<div class="space-y-4">
			<div class="space-y-1">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">Plan</span>
					<span class="text-sm text-muted-foreground">{planName}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">Credits</span>
					<span class="text-sm {colorClass}">
						{available.toLocaleString()} / {total.toLocaleString()}
					</span>
				</div>
			</div>

			<div class="space-y-2">
				<Progress
					value={usagePercentage}
					max={100}
					class={progressColorClass}
				/>
				<p class="text-center text-xs text-muted-foreground">
					{usagePercentage}% used
				</p>
			</div>

			<div class="flex flex-col gap-2">
				<Button size="sm" variant="outline" onclick={onBuyCredits}>
					Buy Credits
				</Button>
				{#if planName === 'Free'}
					<Button size="sm" onclick={onUpgrade}>Upgrade Plan</Button>
				{/if}
			</div>
		</div>
	</Popover.Content>
</Popover.Root>
