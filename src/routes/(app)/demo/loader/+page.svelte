<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import SphereGridLoader from '../../maps/[mapId]/OptimizationLoading/SphereGridLoader.svelte';

	let rows = $state(5);
	let cols = $state(5);
	let size = $state(10);
	let gap = $state(4);
	let minDuration = $state(0.3);
	let maxDuration = $state(3);
	let color = $state('bg-primary');
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-8 p-24">
	<div class="flex items-center justify-center">
		<SphereGridLoader {rows} {cols} {size} {gap} {color} {minDuration} {maxDuration} />
	</div>

	<div class="grid w-full max-w-md grid-cols-2 gap-4">
		<div class="space-y-2">
			<Label>Rows: {rows}</Label>
			<Input type="number" bind:value={rows} min="1" max="20" />
		</div>
		<div class="space-y-2">
			<Label>Cols: {cols}</Label>
			<Input type="number" bind:value={cols} min="1" max="20" />
		</div>
		<div class="space-y-2">
			<Label>Size (px): {size}</Label>
			<Input type="number" bind:value={size} min="4" max="100" />
		</div>
		<div class="space-y-2">
			<Label>Gap (px): {gap}</Label>
			<Input type="number" bind:value={gap} min="0" max="50" />
		</div>
		<div class="space-y-2">
			<Label>Min Duration (s): {minDuration}</Label>
			<Input type="number" step="0.1" bind:value={minDuration} min="0.1" max="10" />
		</div>
		<div class="space-y-2">
			<Label>Max Duration (s): {maxDuration}</Label>
			<Input type="number" step="0.1" bind:value={maxDuration} min="0.1" max="10" />
		</div>
		<div class="col-span-2 space-y-2">
			<Label>Color Class</Label>
			<Input type="text" bind:value={color} placeholder="bg-primary, bg-red-500, etc" />
		</div>
	</div>
</div>
