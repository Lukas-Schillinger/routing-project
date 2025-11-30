<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import Label from '$lib/components/ui/label/label.svelte';
	import type { DepotWithLocationJoin, Driver, Map, StopWithLocation } from '$lib/schemas';
	import { mapApi } from '$lib/services/api';
	import { Building2, Sparkles } from 'lucide-svelte';
	import DepotSelect from './DepotSelect.svelte';
	import FairnessSlider from './FairnessSlider.svelte';

	interface Props {
		map: Map;
		stops: StopWithLocation[];
		depots: DepotWithLocationJoin[];
		assignedDrivers: Driver[];
		isOptimizing: boolean;
		onRoutesOptimized: () => void;
		onDepotCreated: () => void;
	}

	let {
		map,
		stops,
		depots,
		assignedDrivers,
		isOptimizing = $bindable(),
		onRoutesOptimized,
		onDepotCreated
	}: Props = $props();

	let optimizationError = $state('');
	let selectedDepotId = $state<string | undefined>(undefined);
	let fairness = $state<'high' | 'medium' | 'low'>('medium');

	// Set default depot if available
	$effect(() => {
		if (depots.length > 0 && !selectedDepotId) {
			const defaultDepot = depots.find((d) => d.depot.default_depot);
			selectedDepotId = defaultDepot?.depot.id || depots[0].depot.id;
		}
	});

	async function optimizeRoutes() {
		if (isOptimizing) return;

		// Check if a depot is selected
		if (!selectedDepotId) {
			optimizationError = 'Please select a depot for route optimization';
			return;
		}

		// Check if there are drivers assigned
		if (assignedDrivers.length === 0) {
			optimizationError = 'Please assign at least one driver before optimizing routes';
			return;
		}

		// Check if there are stops
		if (stops.length === 0) {
			optimizationError = 'Please add stops to the map before optimizing routes';
			return;
		}

		isOptimizing = true;
		optimizationError = '';

		try {
			console.log('Starting Optimization');
			const res = await mapApi.optimize(map.id, {
				depotId: selectedDepotId,
				fairness
			});

			console.log('Optimization Finished');
			console.log(res.result);
			onRoutesOptimized();
		} catch (err) {
			optimizationError = err instanceof Error ? err.message : 'Failed to optimize routes';
			console.error('Error optimizing routes:', err);
		} finally {
			isOptimizing = false;
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Building2 class="h-5 w-5 text-primary" />
			Route Optimization
		</Card.Title>
		<Card.Description>Configure and optimize delivery routes</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-8">
		<!-- Depot Selection -->
		<div class="space-y-8">
			<div class="space-y-2">
				<Label>Depot</Label>
				<DepotSelect onDepotCreated={() => invalidateAll()} {depots} bind:selectedDepotId />
			</div>

			<div class="">
				<div>
					<Label>Route Options</Label>
					<div class="pt-2 text-sm text-muted-foreground">
						Fair routes evenly distribute stops between drivers. Efficient routes may leave some
						drivers with more stops than others.
					</div>
				</div>
				<div class="px-2"><FairnessSlider bind:fairness /></div>
			</div>
		</div>
		<!-- Optimize Button -->
		<div class="flex justify-center pt-2">
			<Button
				size="default"
				onclick={optimizeRoutes}
				disabled={isOptimizing ||
					!selectedDepotId ||
					depots.length === 0 ||
					assignedDrivers.length === 0 ||
					stops.length === 0}
				class="w-full gap-2"
			>
				{#if isOptimizing}
					<Sparkles class="h-5 w-5 animate-spin" />
					Optimizing Routes...
				{:else}
					<Sparkles class="h-5 w-5" />
					Optimize Routes
				{/if}
			</Button>
		</div>
	</Card.Content>

	<!-- Optimization Error -->
	{#if optimizationError}
		<Card.Root class="border-destructive shadow-lg">
			<Card.Content class="pt-6">
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					<strong>Optimization Error:</strong>
					{optimizationError}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</Card.Root>
