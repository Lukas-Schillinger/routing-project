<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import * as RadioGroup from '$lib/components/ui/radio-group';

	interface Props {
		fairness: 'high' | 'medium' | 'low';
	}

	let { fairness = $bindable() }: Props = $props();

	const fairnessValues = [
		{ value: 'low', label: 'Efficient' },
		{ value: 'medium', label: 'Balanced' },
		{ value: 'high', label: 'Fair' }
	] as const;
</script>

<RadioGroup.Root bind:value={fairness} class="mt-4 flex flex-col gap-6 sm:flex-row">
	{#each fairnessValues as option}
		<div class="flex items-center space-x-2">
			<RadioGroup.Item value={option.value} id={option.value} />
			<Label for={option.value} class="cursor-pointer font-normal">{option.label}</Label>
		</div>
	{/each}
</RadioGroup.Root>
