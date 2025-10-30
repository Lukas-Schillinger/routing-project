<script lang="ts">
	import { Slider } from 'bits-ui';

	interface Props {
		fairness: 'high' | 'medium' | 'low';
	}

	let { fairness = $bindable() }: Props = $props();

	const fairnessValues = [
		{ value: 'low', number: 0, label: 'Fair' },
		{ value: 'medium', number: 50, label: 'Balanced' },
		{ value: 'high', number: 100, label: 'Efficient' }
	] as const;

	// Get current fairness as number for slider
	let sliderValue = $state(fairnessValues.find((f) => f.value === fairness)?.number ?? 50);

	// Update fairness when slider changes
	function handleValueChange(value: number) {
		sliderValue = value;

		// Find closest fairness value
		let closestFairness = fairnessValues[0];
		let minDistance = Math.abs(value - fairnessValues[0].number);

		for (const fv of fairnessValues) {
			const distance = Math.abs(value - fv.number);
			if (distance < minDistance) {
				minDistance = distance;
				closestFairness = fv;
			}
		}

		fairness = closestFairness.value;
		sliderValue = closestFairness.number; // Snap to exact value
	}

	// Get current fairness label reactively
	let currentFairness = $derived(fairnessValues.find((f) => f.value === fairness));
</script>

<Slider.Root
	type="single"
	bind:value={sliderValue}
	onValueChange={handleValueChange}
	max={100}
	min={0}
	step={1}
	class="relative mt-10  flex w-full touch-none items-center select-none"
>
	{#snippet children()}
		<span class="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
			<Slider.Range class="absolute h-full bg-primary" />
		</span>

		<!-- Step markers -->
		{#each fairnessValues as fairnessValue}
			<Slider.Tick
				index={fairnessValue.number}
				class="z-1 h-2 w-[1px] bg-background dark:bg-background"
			/>
			<Slider.TickLabel
				index={fairnessValue.number}
				class="mb-2 text-sm leading-none font-medium text-muted-foreground data-selected:text-foreground"
			>
				{fairnessValue.label}
			</Slider.TickLabel>
		{/each}

		<Slider.Thumb
			index={0}
			class="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
		/>
	{/snippet}
</Slider.Root>
