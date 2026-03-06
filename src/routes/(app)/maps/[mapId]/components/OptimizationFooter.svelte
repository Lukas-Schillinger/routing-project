<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { INVALIDATION_KEYS } from '$lib/invalidation-keys';
	import CreditBadge from '$lib/components/billing/CreditBadge.svelte';
	import { ConfirmDeleteDialog } from '$lib/components/ConfirmDeleteDialog';
	import EditOrCreateDepotPopover from '$lib/components/EditOrCreateDepotPopover';
	import * as Alert from '$lib/components/ui/alert';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Popover from '$lib/components/ui/popover';
	import * as Select from '$lib/components/ui/select';
	import * as Tabs from '$lib/components/ui/tabs';
	import { ServiceError } from '$lib/errors';
	import type { CreditBalance } from '$lib/schemas/billing';
	import type {
		DepotWithLocationJoin,
		Driver,
		Map,
		Route,
		StopWithLocation
	} from '$lib/schemas';
	import { mapApi } from '$lib/services/api';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Plus from '@lucide/svelte/icons/plus';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import X from '@lucide/svelte/icons/x';
	import { toast } from 'svelte-sonner';

	type PageState = 'normal' | 'optimizing';

	let {
		map,
		stops,
		depots,
		assignedDrivers,
		routes,
		pageState,
		planSlug,
		credits,
		monthlyCredits,
		onDepotChange,
		pollerError,
		parentError,
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
		planSlug?: 'free' | 'pro';
		credits?: CreditBalance;
		monthlyCredits?: number;
		pollerError?: string | null;
		parentError?: string | null;
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
	let error = $state<string | null>(null);

	const hasRoutes = $derived(routes.length > 0);

	// Combine submission errors and polling errors into a single displayed message
	const displayError = $derived(error || pollerError || parentError || null);

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
		error = null;

		try {
			await mapApi.queueOptimization(map.id, {
				depotId: selectedDepotId,
				fairness
			});
			onOptimize();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to optimize routes';
		} finally {
			isSubmitting = false;
		}
	}

	async function handleCancel() {
		try {
			await mapApi.cancelOptimization(map.id);
			onCancel();
		} catch (err) {
			error =
				err instanceof ServiceError
					? err.message
					: 'Failed to cancel optimization';
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
		error = null;
		try {
			await mapApi.resetOptimization(map.id);
			await invalidate(INVALIDATION_KEYS.MAP_DATA);
			toast.success('Routes reset successfully');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to reset routes';
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
		{#if displayError}
			<Alert.Root variant="destructive" class="mb-2 px-2.5 py-1.5">
				<AlertCircle class="h-3.5 w-3.5 shrink-0" />
				<Alert.Description class="truncate">{displayError}</Alert.Description>
			</Alert.Root>
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
				<Tabs.Root bind:value={fairness} class="shrink-0">
					<Tabs.List
						class="h-8 rounded-md border border-input bg-muted/30 p-0.5"
					>
						<Tabs.Trigger value="low" class="h-7 rounded px-2 text-xs"
							>Fast</Tabs.Trigger
						>
						<Tabs.Trigger value="medium" class="h-7 rounded px-2 text-xs"
							>Balanced</Tabs.Trigger
						>
						<Tabs.Trigger value="high" class="h-7 rounded px-2 text-xs"
							>Fair</Tabs.Trigger
						>
					</Tabs.List>
				</Tabs.Root>
			</div>

			<!-- Reset and Optimize Buttons with validation info -->
			<div class="flex grow gap-2 @2xl:max-w-52">
				{#if planSlug && credits && monthlyCredits}
					<CreditBadge {planSlug} {credits} {monthlyCredits} {onUpgrade} />
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
							aria-label="Validation warning"
						>
							<TriangleAlert class="h-3.5 w-3.5 text-warning" />
						</Popover.Trigger>
						<Popover.Content
							class="w-auto max-w-50 border-warning/50 p-2 text-xs text-warning"
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
