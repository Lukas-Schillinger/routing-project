<script lang="ts">
	import { Progress } from '$lib/components/ui/progress';

	type Props = {
		available: number;
		monthlyCredits: number;
		showCount?: boolean;
		showPercentageLabel?: boolean;
	};

	let {
		available,
		monthlyCredits,
		showCount = true,
		showPercentageLabel = false
	}: Props = $props();

	const remainingPercentage = $derived(
		monthlyCredits > 0 ? Math.round((available / monthlyCredits) * 100) : 0
	);

	const progressColorClass = $derived.by(() => {
		if (remainingPercentage <= 0)
			return '[&_[data-slot=progress-indicator]]:bg-red-600';
		if (remainingPercentage <= 20)
			return '[&_[data-slot=progress-indicator]]:bg-yellow-600';
		return '[&_[data-slot=progress-indicator]]:bg-primary';
	});
</script>

<div>
	<Progress value={remainingPercentage} max={100} class={progressColorClass} />
	{#if showCount}
		<p class="text-sm text-muted-foreground">
			{available.toLocaleString()} / {monthlyCredits.toLocaleString()}
		</p>
	{/if}
	{#if showPercentageLabel}
		<p class="text-center text-xs text-muted-foreground">
			{remainingPercentage}% remaining this period
		</p>
	{/if}
</div>
