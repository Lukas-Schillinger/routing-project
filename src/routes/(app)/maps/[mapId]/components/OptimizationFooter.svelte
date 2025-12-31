<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import EditOrCreateDepotPopover from '$lib/components/EditOrCreateDepotPopover';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import * as Popover from '$lib/components/ui/popover';
	import * as Select from '$lib/components/ui/select';
	import type { DepotWithLocationJoin, Driver, Map, StopWithLocation } from '$lib/schemas';
	import { mapApi } from '$lib/services/api';
	import { AlertCircle, Building2, Info, Loader2, Plus, Sparkles, X } from 'lucide-svelte';
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

	const validationMessage = $derived.by(() => {
		if (!selectedDepotId) return 'Select a depot to optimize routes';
		if (assignedDrivers.length === 0) return 'Add at least one driver';
		if (stops.length === 0) return 'Add at least one stop';
		return null;
	});

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

<div class="@container px-3 pb-2">
	{#if pageState === 'viewing'}
		<!-- Viewing Mode -->
		<Button variant="outline" class="w-full" onclick={onSwitchToEdit}>Switch to Edit Mode</Button>
	{:else if pageState === 'optimizing'}
		<!-- Optimizing Mode -->
		<div
			class="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
		>
			<div class="flex items-center gap-2">
				<Loader2 class="h-4 w-4 animate-spin text-primary" />
				<span class="text-sm font-medium">Optimizing routes...</span>
			</div>
			<Button variant="ghost" size="sm" class="h-7 px-2" onclick={handleCancel}>
				<X class="mr-1 h-3.5 w-3.5" />
				Cancel
			</Button>
		</div>
	{:else}
		<!-- Editing Mode -->
		{#if error}
			<div
				class="mb-2 flex items-center gap-2 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive"
			>
				<AlertCircle class="h-3.5 w-3.5 shrink-0" />
				<span class="truncate">{error}</span>
			</div>
		{/if}

		<div class="flex flex-col gap-2 @md:flex-row">
			<div class="flex gap-2">
				<!-- Depot + Add button -->
				<ButtonGroup.Root class="grow">
					<Select.Root type="single" bind:value={selectedDepotId}>
						<Select.Trigger size="sm" class="h-7 w-32 grow rounded-r-none border-r-0">
							{#if selectedDepotId}
								{@const selected = depots.find((d) => d.depot.id === selectedDepotId)}
								<div class="flex items-center gap-1.5 truncate">
									<Building2 class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
									<span class="truncate text-xs">{selected?.depot.name || 'Depot'}</span>
								</div>
							{:else}
								<span class="text-xs text-muted-foreground">Select depot</span>
							{/if}
						</Select.Trigger>
						<Select.Content>
							{#each depots as depot}
								<Select.Item value={depot.depot.id}>
									<div class="flex items-center gap-2">
										<Building2 class="h-3.5 w-3.5" />
										<span>{depot.depot.name}</span>
										{#if depot.depot.default_depot}
											<span class="text-xs text-muted-foreground">(Default)</span>
										{/if}
									</div>
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>

					<EditOrCreateDepotPopover
						triggerClass="{buttonVariants({ variant: 'outline' })} h-8 w-8 rounded-l-none px-0"
						mode="create"
						onSuccess={handleDepotCreated}
					>
						<Plus class="h-3.5 w-3.5" />
					</EditOrCreateDepotPopover>
				</ButtonGroup.Root>

				<!-- Fairness Toggle -->
				<div class="flex h-8 shrink-0 rounded-md border border-input bg-muted/30 p-0.5">
					<button
						type="button"
						class="h-7 rounded px-2 text-xs transition-colors {fairness === 'low'
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground'}"
						onclick={() => (fairness = 'low')}
					>
						Fast
					</button>
					<button
						type="button"
						class="h-7 rounded px-2 text-xs transition-colors {fairness === 'medium'
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground'}"
						onclick={() => (fairness = 'medium')}
					>
						Balanced
					</button>
					<button
						type="button"
						class="h-7 rounded px-2 text-xs transition-colors {fairness === 'high'
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground'}"
						onclick={() => (fairness = 'high')}
					>
						Fair
					</button>
				</div>
			</div>

			<!-- Optimize Button with validation info -->
			<div class="flex grow">
				<Button
					class="h-8 grow gap-1.5 {validationMessage ? 'rounded-r-none' : ''}"
					size="sm"
					disabled={!canOptimize}
					onclick={handleOptimize}
				>
					{#if isSubmitting}
						<Loader2 class="h-3.5 w-3.5 animate-spin" />
						Starting
					{:else}
						<Sparkles class="h-3.5 w-3.5" />
						Optimize
					{/if}
				</Button>
				{#if validationMessage && !isSubmitting}
					<Popover.Root>
						<Popover.Trigger
							class="flex h-8 items-center justify-center rounded-l-none rounded-r-md border border-l-0 border-amber-500/50 bg-amber-500/10 px-2 text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
						>
							<Info class="h-3.5 w-3.5" />
						</Popover.Trigger>
						<Popover.Content class="w-auto max-w-[200px] p-2 text-xs" side="top">
							{validationMessage}
						</Popover.Content>
					</Popover.Root>
				{/if}
			</div>
		</div>
	{/if}
</div>
