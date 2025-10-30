<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import type { DepotWithLocationJoin, Driver, Map, StopWithLocation } from '$lib/schemas';
	import { mapApi } from '$lib/services/api';
	import { Building2, Sparkles } from 'lucide-svelte';

	interface Props {
		map: Map;
		stops: StopWithLocation[];
		depots: DepotWithLocationJoin[];
		assignedDrivers: Driver[];
		isOptimizing: boolean;
		onRoutesOptimized: () => void;
	}

	let {
		map,
		stops,
		depots,
		assignedDrivers,
		isOptimizing = $bindable(),
		onRoutesOptimized
	}: Props = $props();

	let optimizationError = $state('');
	let selectedDepotId = $state<string | undefined>(undefined);

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
				fairness: 'medium', // Options: 'high', 'medium', 'low'
				timeLimitSec: 30, // Optimization time limit
				startAtDepot: true, // Routes start at depot
				endAtDepot: true // Routes end at depot
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
	<Card.Content class="space-y-4">
		<!-- Depot Selection -->
		<div class="space-y-2">
			<Label for="depot-select">Starting Depot</Label>
			{#if depots.length === 0}
				<p class="text-sm text-muted-foreground">
					No depots available. Please create a depot before optimizing routes.
				</p>
			{:else}
				<Select.Root type="single" bind:value={selectedDepotId}>
					<Select.Trigger id="depot-select" class="w-full">
						{#if selectedDepotId}
							{@const selectedDepot = depots.find((d) => d.depot.id === selectedDepotId)}
							{#if selectedDepot}
								<div class="flex items-center gap-2">
									<Building2 class="h-4 w-4" />
									<span>{selectedDepot.depot.name}</span>
								</div>
							{/if}
						{:else}
							<span class="text-muted-foreground">Select a depot</span>
						{/if}
					</Select.Trigger>
					<Select.Content>
						{#each depots as depot}
							<Select.Item value={depot.depot.id}>
								<div class="flex items-center gap-2">
									<Building2 class="h-4 w-4" />
									<div>
										<div class="font-medium">{depot.depot.name}</div>
										<div class="text-xs text-muted-foreground">
											{depot.location.address_line1}
										</div>
									</div>
									{#if depot.depot.default_depot}
										<span class="ml-auto text-xs text-primary">(Default)</span>
									{/if}
								</div>
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			{/if}
		</div>

		<!-- Optimize Button -->
		<div class="flex justify-center pt-2">
			<Button
				size="lg"
				onclick={optimizeRoutes}
				disabled={isOptimizing ||
					!selectedDepotId ||
					depots.length === 0 ||
					assignedDrivers.length === 0 ||
					stops.length === 0}
				class="gap-2"
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
