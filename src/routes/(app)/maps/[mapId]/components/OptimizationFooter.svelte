<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import CreditBadge from '$lib/components/billing/CreditBadge.svelte';
	import { ConfirmDeleteDialog } from '$lib/components/ConfirmDeleteDialog';
	import EditOrCreateDepotPopover from '$lib/components/EditOrCreateDepotPopover';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Popover from '$lib/components/ui/popover';
	import * as Select from '$lib/components/ui/select';
	import { ServiceError } from '$lib/errors';
	import type { CreditBalance } from '$lib/schemas/billing';
	import type {
		DepotWithLocationJoin,
		Driver,
		Map,
		Route,
		StopWithLocation
	} from '$lib/schemas';
	import type { Plan } from '$lib/server/db/schema';
	import { mapApi } from '$lib/services/api';
	import {
		AlertCircle,
		Building2,
		Loader2,
		Plus,
		RotateCcw,
		Sparkles,
		TriangleAlert,
		X
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	type PageState = 'normal' | 'optimizing';

	let {
		map,
		stops,
		depots,
		assignedDrivers,
		routes,
		pageState,
		plan,
		credits,
		onDepotChange,
		onOptimize,
		onCancel,
		onUpgrade
	}: {
		map: Map;
		stops: StopWithLocation[];
		depots: DepotWithLocationJoin[];
		assignedDrivers: Driver[];
		routes: Route[];
		pageState: PageState;
		plan?: Plan;
		credits?: CreditBalance;
		onDepotChange: (depotId: string) => Promise<void>;
		onOptimize: () => void;
		onCancel: () => void;
		onUpgrade?: () => void;
	} = $props();

	// Derive selectedDepotId from map's depot_id
	let selectedDepotId = $derived(map.depot_id ?? undefined);

	// Pending depot change (for confirmation dialog)
	let pendingDepotId = $state<string | null>(null);
	let showDepotChangeConfirm = $state(false);
	let isChangingDepot = $state(false);

	let fairness = $state<'high' | 'medium' | 'low'>('medium');
	let isSubmitting = $state(false);
	let isResetting = $state(false);
	let error = $state('');

	const hasRoutes = $derived(routes.length > 0);

	// Count unassigned stops
	const unassignedStopsCount = $derived(
		stops.filter((s) => s.stop.driver_id === null).length
	);

	const allStopsAssigned = $derived(
		stops.length > 0 && unassignedStopsCount === 0
	);

	const canOptimize = $derived(
		selectedDepotId &&
			assignedDrivers.length > 0 &&
			stops.length > 0 &&
			!allStopsAssigned &&
			!isSubmitting
	);

	const validationMessage = $derived.by(() => {
		if (!selectedDepotId) return 'Select a depot to optimize routes';
		if (assignedDrivers.length === 0) return 'Add at least one driver';
		if (stops.length === 0) return 'Add at least one stop';
		if (allStopsAssigned) return 'All stops are already assigned';
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
		} finally {
			isSubmitting = false;
		}
	}

	async function handleCancel() {
		try {
			await mapApi.cancelOptimization(map.id);
			onCancel();
		} catch (err) {
			if (err instanceof ServiceError) {
				toast.error(err.message);
			} else {
				toast.error('Failed to cancel optimization');
			}
		}
	}

	function handleDepotCreated(depot: DepotWithLocationJoin) {
		onDepotChange(depot.depot.id);
	}

	function handleDepotSelect(newDepotId: string) {
		// If routes exist and depot is changing, show confirmation
		if (hasRoutes && newDepotId !== selectedDepotId) {
			pendingDepotId = newDepotId;
			showDepotChangeConfirm = true;
		} else {
			onDepotChange(newDepotId);
		}
	}

	async function confirmDepotChange() {
		if (pendingDepotId) {
			isChangingDepot = true;
			try {
				await onDepotChange(pendingDepotId);
				pendingDepotId = null;
				showDepotChangeConfirm = false;
			} finally {
				isChangingDepot = false;
			}
		}
	}

	function cancelDepotChange() {
		pendingDepotId = null;
		showDepotChangeConfirm = false;
	}

	async function handleResetRoutes() {
		isResetting = true;
		try {
			await mapApi.resetOptimization(map.id);
			await invalidateAll();
			toast.success('Routes reset successfully');
		} catch (err) {
			toast.error('Failed to reset routes', {
				description: err instanceof Error ? err.message : 'Unknown error'
			});
		} finally {
			isResetting = false;
		}
	}
</script>

<div class="@container pb-2">
	{#if pageState === 'optimizing'}
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
		<!-- Normal Mode - Optimization Controls -->
		{#if error}
			<div
				class="mb-2 flex items-center gap-2 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive"
			>
				<AlertCircle class="h-3.5 w-3.5 shrink-0" />
				<span class="truncate">{error}</span>
			</div>
		{/if}

		<div class="flex flex-col gap-2 @2xl:flex-row">
			<div class="flex gap-2">
				<!-- Depot + Add button -->
				<ButtonGroup.Root class="grow @lg:min-w-48">
					<Select.Root
						type="single"
						value={selectedDepotId}
						onValueChange={(value) => value && handleDepotSelect(value)}
					>
						<Select.Trigger
							size="sm"
							class="h-7 w-32 grow rounded-r-none border-r-0"
						>
							{#if selectedDepotId}
								{@const selected = depots.find(
									(d) => d.depot.id === selectedDepotId
								)}
								<div class="flex items-center gap-1.5 truncate">
									<Building2
										class="h-3.5 w-3.5 shrink-0 text-muted-foreground"
									/>
									<span class="truncate text-xs"
										>{selected?.depot.name || 'Depot'}</span
									>
								</div>
							{:else}
								<span class="text-xs text-muted-foreground">Select depot</span>
							{/if}
						</Select.Trigger>
						<Select.Content>
							{#each depots as depot (depot.depot.id)}
								<Select.Item value={depot.depot.id}>
									<div class="flex items-center gap-2">
										<Building2 class="h-3.5 w-3.5" />
										<span>{depot.depot.name}</span>
										{#if depot.depot.default_depot}
											<span class="text-xs text-muted-foreground"
												>(Default)</span
											>
										{/if}
									</div>
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>

					<EditOrCreateDepotPopover
						triggerClass="{buttonVariants({
							variant: 'outline',
							size: 'sm'
						})} h-8 w-8 rounded-l-none px-0"
						mode="create"
						onSuccess={handleDepotCreated}
					>
						<Plus class="h-3.5 w-3.5 text-muted-foreground" />
					</EditOrCreateDepotPopover>
				</ButtonGroup.Root>

				<!-- Fairness Toggle -->
				<div
					class="flex h-8 shrink-0 rounded-md border border-input bg-muted/30 p-0.5"
				>
					<button
						type="button"
						class="h-7 rounded px-2 text-xs transition-colors {fairness ===
						'low'
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground'}"
						onclick={() => (fairness = 'low')}
					>
						Fast
					</button>
					<button
						type="button"
						class="h-7 rounded px-2 text-xs transition-colors {fairness ===
						'medium'
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground'}"
						onclick={() => (fairness = 'medium')}
					>
						Balanced
					</button>
					<button
						type="button"
						class="h-7 rounded px-2 text-xs transition-colors {fairness ===
						'high'
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground'}"
						onclick={() => (fairness = 'high')}
					>
						Fair
					</button>
				</div>
			</div>

			<!-- Reset and Optimize Buttons with validation info -->
			<div class="flex grow gap-2 @2xl:max-w-52">
				{#if plan && credits}
					<CreditBadge {plan} {credits} {onUpgrade} />
				{/if}
				<ConfirmDeleteDialog
					title="Reset Routes"
					description="Are you sure you want to reset all routes? This will clear all driver assignments and route geometries."
					confirmText="Reset"
					onConfirm={handleResetRoutes}
				>
					{#snippet trigger({ props })}
						<Button
							{...props}
							variant="outline"
							size="sm"
							class="h-8 gap-1.5"
							disabled={!hasRoutes || isResetting}
						>
							{#if isResetting}
								<Loader2 class="h-3.5 w-3.5 animate-spin" />
							{:else}
								<RotateCcw class="h-3.5 w-3.5" />
							{/if}
							Reset
						</Button>
					{/snippet}
				</ConfirmDeleteDialog>
				<Button
					class="h-8 grow gap-1.5"
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
							class="inline-flex h-8 items-center justify-center rounded-md border border-warning bg-warning/15 px-2 text-warning-foreground transition-colors hover:bg-warning/25"
						>
							<TriangleAlert class="h-3.5 w-3.5" />
						</Popover.Trigger>
						<Popover.Content
							class="w-auto max-w-50 border-warning/50 p-2 text-xs text-warning-foreground"
							side="top"
						>
							{validationMessage}
						</Popover.Content>
					</Popover.Root>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Depot Change Confirmation Dialog -->
<Dialog.Root bind:open={showDepotChangeConfirm}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Change Depot</Dialog.Title>
			<Dialog.Description>
				Changing the depot will reset all existing routes and driver
				assignments. This cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="pt-4">
			<Button
				variant="outline"
				onclick={cancelDepotChange}
				disabled={isChangingDepot}>Cancel</Button
			>
			<Button
				variant="destructive"
				onclick={confirmDepotChange}
				disabled={isChangingDepot}
			>
				{#if isChangingDepot}
					<Loader2 class="mr-1.5 h-3.5 w-3.5 animate-spin" />
					Changing...
				{:else}
					Change Depot
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
