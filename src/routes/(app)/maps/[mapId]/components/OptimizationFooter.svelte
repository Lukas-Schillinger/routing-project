<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import EditOrCreateDepotPopover from '$lib/components/EditOrCreateDepotPopover';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import type { DepotWithLocationJoin, Driver, Map, StopWithLocation } from '$lib/schemas';
	import { mapApi } from '$lib/services/api';
	import { AlertCircle, Building2, Loader2, Plus, Sparkles, X } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	type PageState = 'viewing' | 'optimizing' | 'editing';

	let {
		map,
		stops,
		depots,
		assignedDrivers,
		pageState,
		selectedDepotId = $bindable(),
		onOptimize,
		onCancel,
		onSwitchToEdit
	}: {
		map: Map;
		stops: StopWithLocation[];
		depots: DepotWithLocationJoin[];
		assignedDrivers: Driver[];
		pageState: PageState;
		selectedDepotId: string | undefined;
		onOptimize: () => void;
		onCancel: () => void;
		onSwitchToEdit: () => void;
	} = $props();

	let fairness = $state<'high' | 'medium' | 'low'>('medium');
	let isSubmitting = $state(false);
	let error = $state('');

	// Set default depot if available
	$effect(() => {
		if (depots.length > 0 && !selectedDepotId) {
			const defaultDepot = depots.find((d) => d.depot.default_depot);
			selectedDepotId = defaultDepot?.depot.id || depots[0].depot.id;
		}
	});

	const canOptimize = $derived(
		selectedDepotId && assignedDrivers.length > 0 && stops.length > 0 && !isSubmitting
	);

	async function handleOptimize() {
		if (!canOptimize || !selectedDepotId) return;

		isSubmitting = true;
		error = '';

		try {
			await mapApi.queueOptimization(map.id, {
				depotId: selectedDepotId,
				fairness
			});
			onOptimize();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to optimize routes';
			toast.error('Optimization failed', { description: error });
			isSubmitting = false;
		}
	}

	async function handleCancel() {
		try {
			await mapApi.cancelOptimization(map.id);
			onCancel();
		} catch (err) {
			toast.error('Failed to cancel optimization');
		}
	}

	function handleDepotCreated(depot: DepotWithLocationJoin) {
		selectedDepotId = depot.depot.id;
		invalidateAll();
	}
</script>

<div class="p-2 pt-0">
	{#if pageState === 'viewing'}
		<!-- Viewing Mode: Show edit button -->
		<Button variant="outline" class="w-full" onclick={onSwitchToEdit}>Switch to Edit Mode</Button>
	{:else if pageState === 'optimizing'}
		<!-- Optimizing Mode: Show progress and cancel -->
		<div class="flex items-center gap-3">
			<div class="flex flex-1 items-center gap-2">
				<Loader2 class="h-4 w-4 animate-spin text-primary" />
				<span class="text-sm">Optimizing routes...</span>
			</div>
			<Button variant="ghost" size="sm" onclick={handleCancel}>
				<X class="mr-1.5 h-3.5 w-3.5" />
				Cancel
			</Button>
		</div>
	{:else}
		<!-- Editing Mode: Show optimization controls -->
		<div class="space-y-3">
			{#if error}
				<div
					class="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
				>
					<AlertCircle class="h-4 w-4" />
					{error}
				</div>
			{/if}

			<!-- Optimize Button -->
			<Button class="w-full gap-2" disabled={!canOptimize} onclick={handleOptimize}>
				{#if isSubmitting}
					<Loader2 class="h-4 w-4 animate-spin" />
					Starting...
				{:else}
					<Sparkles class="h-4 w-4" />
					Optimize Routes
				{/if}
			</Button>

			<!-- Validation hints -->
			{#if !canOptimize && !isSubmitting}
				<p class="text-center text-xs text-muted-foreground">
					{#if !selectedDepotId}
						Select a depot to optimize
					{:else if assignedDrivers.length === 0}
						Add drivers to optimize
					{:else if stops.length === 0}
						Add stops to optimize
					{/if}
				</p>
			{/if}

			<!-- Compact controls row -->
			<div class="flex flex-wrap items-center gap-2">
				<!-- Depot Select -->
				<div class="flex min-w-0 flex-1 items-center gap-1.5">
					<Select.Root type="single" bind:value={selectedDepotId}>
						<Select.Trigger class="h-9 min-w-[140px] flex-1">
							{#if selectedDepotId}
								{@const selected = depots.find((d) => d.depot.id === selectedDepotId)}
								<div class="flex items-center gap-1.5 truncate">
									<Building2 class="h-3.5 w-3.5 shrink-0" />
									<span class="truncate">{selected?.depot.name || 'Select depot'}</span>
								</div>
							{:else}
								<span class="text-muted-foreground">Select depot</span>
							{/if}
						</Select.Trigger>
						<Select.Content>
							{#each depots as depot}
								<Select.Item value={depot.depot.id}>
									<div class="flex items-center gap-2">
										<Building2 class="h-4 w-4" />
										<span>{depot.depot.name}</span>
										{#if depot.depot.default_depot}
											<span class="text-xs text-muted-foreground">(Default)</span>
										{/if}
									</div>
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>

					<EditOrCreateDepotPopover mode="create" onSuccess={handleDepotCreated}>
						<Button variant="ghost" size="icon" class="h-9 w-9 shrink-0">
							<Plus class="h-4 w-4" />
						</Button>
					</EditOrCreateDepotPopover>
				</div>

				<!-- Fairness Toggle -->
				<div class="flex h-9 rounded-md border border-border/50 bg-muted/50 p-0.5">
					<button
						type="button"
						class="h-8 rounded-sm px-2.5 text-xs transition-colors {fairness === 'low'
							? 'bg-background shadow-sm'
							: 'hover:bg-background/50'}"
						onclick={() => (fairness = 'low')}
					>
						Fast
					</button>
					<button
						type="button"
						class="h-8 rounded-sm px-2.5 text-xs transition-colors {fairness === 'medium'
							? 'bg-background shadow-sm'
							: 'hover:bg-background/50'}"
						onclick={() => (fairness = 'medium')}
					>
						Balanced
					</button>
					<button
						type="button"
						class="h-8 rounded-sm px-2.5 text-xs transition-colors {fairness === 'high'
							? 'bg-background shadow-sm'
							: 'hover:bg-background/50'}"
						onclick={() => (fairness = 'high')}
					>
						Fair
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
