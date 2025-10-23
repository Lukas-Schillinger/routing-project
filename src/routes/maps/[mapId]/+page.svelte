<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import MapView from '$lib/components/MapView.svelte';
	import EditDriversTable from '$lib/components/map/EditDriversTable.svelte';
	import EditStopsTable from '$lib/components/map/EditStopsTable.svelte';
	import ViewDriversTable from '$lib/components/map/ViewDriversTable.svelte';
	import ViewStopsTable from '$lib/components/map/ViewStopsTable.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import * as Command from '$lib/components/ui/command';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Popover from '$lib/components/ui/popover';
	import { assignDriverToMap, createDriver, removeDriverFromMap } from '$lib/services/driver-api';
	import { formatDate } from '$lib/utils';
	import {
		ArrowLeft,
		Calendar,
		Check,
		ChevronsUpDown,
		Edit,
		MapPin,
		Navigation,
		Plus,
		Truck,
		UserPlus
	} from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let open = $state(false);
	let openNewDriver = $state(false);
	let value = $state('');
	let newDriverPhone = $state('');
	let isLoading = $state(false);
	let errorMessage = $state('');
	let isOptimizing = $state(false);
	let optimizationResult = $state<any>(null);
	let optimizationError = $state('');
	let isViewMode = $state((data as any).isViewMode ?? false);

	// Update view mode when data changes
	$effect(() => {
		isViewMode = (data as any).isViewMode ?? false;
	});

	// Generate random driver name
	function generateDriverName(): string {
		const randomNum = Math.floor(Math.random() * 1000000);
		return `driver-${randomNum}`;
	}

	let newDriverName = $state(generateDriverName());

	// Computed values
	let selectedDriver = $derived(data.allDrivers?.find((d) => d.id === value));

	// Close and reset the combobox
	function closeAndReset() {
		open = false;
		value = '';
		errorMessage = '';
	}

	async function addExistingDriver() {
		if (!value || isLoading) return;

		isLoading = true;
		errorMessage = '';

		try {
			// Assign the driver to this map
			await assignDriverToMap(data.map.id, value);

			// Refresh the page data
			await invalidateAll();
			closeAndReset();
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to assign driver';
			console.error('Error assigning driver:', err);
		} finally {
			isLoading = false;
		}
	}

	async function addTemporaryDriver() {
		if (!newDriverName.trim() || isLoading) return;

		isLoading = true;
		errorMessage = '';

		try {
			// First, create the temporary driver
			const newDriver = await createDriver({
				name: newDriverName.trim(),
				phone: newDriverPhone.trim() || null,
				temporary: true,
				active: true
			});

			// Then assign the driver to this map
			await assignDriverToMap(data.map.id, newDriver.id);

			// Refresh the page data
			await invalidateAll();

			// Reset form
			newDriverName = generateDriverName();
			newDriverPhone = '';
			openNewDriver = false;
			errorMessage = '';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to create temporary driver';
			console.error('Error creating temporary driver:', err);
		} finally {
			isLoading = false;
		}
	}

	async function removeDriver(routeId: string) {
		if (isLoading) return;

		if (!confirm('Are you sure you want to remove this driver from the map?')) {
			return;
		}

		isLoading = true;
		errorMessage = '';

		try {
			await removeDriverFromMap(data.map.id, routeId);

			// Refresh the page data
			await invalidateAll();
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to remove driver';
			console.error('Error removing driver:', err);
		} finally {
			isLoading = false;
		}
	}

	async function optimizeRoutes() {
		if (isOptimizing) return;

		// Check if there are drivers assigned
		if (data.assignedDrivers.length === 0) {
			optimizationError = 'Please assign at least one driver before optimizing routes';
			return;
		}

		// Check if there are stops
		if (data.stops.length === 0) {
			optimizationError = 'Please add stops to the map before optimizing routes';
			return;
		}

		isOptimizing = true;
		optimizationError = '';
		optimizationResult = null;

		try {
			const response = await fetch(`/api/maps/${data.map.id}/optimize`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					mode: 'drive',
					optimize: 'time',
					traffic: 'approximated',
					globalStopConfig: {
						serviceTime: 300 // 5 minutes per stop
					}
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Optimization failed');
			}

			const res = await response.json();
			optimizationResult = res.result;

			// Switch to view mode after successful optimization
			isViewMode = true;

			// Refresh the page data to show updated routes
			await invalidateAll();
		} catch (err) {
			optimizationError = err instanceof Error ? err.message : 'Failed to optimize routes';
			console.error('Error optimizing routes:', err);
		} finally {
			isOptimizing = false;
		}
	}

	async function switchToEditMode() {
		if (isLoading) return;

		if (
			!confirm(
				'Switching to edit mode will remove all optimized route stops. Are you sure you want to continue?'
			)
		) {
			return;
		}

		isLoading = true;
		errorMessage = '';

		try {
			const formData = new FormData();
			const response = await fetch(`/maps/${data.map.id}?/resetOptimization`, {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				throw new Error('Failed to reset optimization');
			}

			// Switch to edit mode
			isViewMode = false;
			optimizationResult = null;

			// Refresh the page data
			await invalidateAll();
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to switch to edit mode';
			console.error('Error switching to edit mode:', err);
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{data.map.title} - Routing Project</title>
</svelte:head>

<div class="mx-auto p-6">
	<!-- Header -->
	<div class="mb-8">
		<Button href="/maps" variant="ghost" size="sm" class="mb-4">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Maps
		</Button>
		<div class="flex items-start justify-between">
			<div>
				<h1 class="headline-large mb-2">{data.map.title}</h1>
				<div class="flex items-center gap-4 text-sm text-muted-foreground">
					<div class="flex items-center">
						<Calendar class="mr-2 h-4 w-4" />
						Created {formatDate(data.map.created_at)}
					</div>
					<Badge variant="secondary">
						<MapPin class="mr-1 h-3 w-3" />
						{data.stops.length}
						{data.stops.length === 1 ? 'Stop' : 'Stops'}
					</Badge>
					{#if isViewMode}
						<Badge variant="default" class="bg-green-600">
							<Check class="mr-1 h-3 w-3" />
							Optimized
						</Badge>
					{:else}
						<Badge variant="outline">Edit Mode</Badge>
					{/if}
				</div>
			</div>
			<div class="flex gap-2">
				{#if isViewMode}
					<Button variant="outline" onclick={switchToEditMode} disabled={isLoading}>
						<Edit class="mr-2 h-4 w-4" />
						Edit Routes
					</Button>
				{:else}
					<Button variant="outline" onclick={optimizeRoutes} disabled={isOptimizing}>
						<Navigation class="mr-2 h-4 w-4" />
						{isOptimizing ? 'Optimizing...' : 'Optimize Routes'}
					</Button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Optimization Results -->
	{#if optimizationResult}
		<Card class="mb-8 border-green-500">
			<CardHeader>
				<CardTitle class="text-green-600">✓ Optimization Complete</CardTitle>
				<CardDescription>Route optimization results</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					<!-- Summary Stats -->
					<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
						<div class="rounded-lg border bg-card p-4">
							<div class="text-2xl font-bold">{optimizationResult.summary.totalDrivers}</div>
							<div class="text-sm text-muted-foreground">Drivers</div>
						</div>
						<div class="rounded-lg border bg-card p-4">
							<div class="text-2xl font-bold">{optimizationResult.summary.totalStops}</div>
							<div class="text-sm text-muted-foreground">Stops</div>
						</div>
						<div class="rounded-lg border bg-card p-4">
							<div class="text-2xl font-bold">
								{(optimizationResult.summary.totalDistance / 1000).toFixed(1)}km
							</div>
							<div class="text-sm text-muted-foreground">Total Distance</div>
						</div>
						<div class="rounded-lg border bg-card p-4">
							<div class="text-2xl font-bold">
								{Math.round(optimizationResult.summary.totalDuration / 60)}min
							</div>
							<div class="text-sm text-muted-foreground">Total Duration</div>
						</div>
						<div class="rounded-lg border bg-card p-4">
							<div class="text-2xl font-bold">
								{Math.round(optimizationResult.summary.totalServiceTime / 60)}min
							</div>
							<div class="text-sm text-muted-foreground">Service Time</div>
						</div>
					</div>

					<!-- Unassigned Stops -->
					{#if optimizationResult.unassigned.length > 0}
						<div class="rounded-lg border border-amber-500 bg-amber-50 p-4">
							<h4 class="mb-2 font-semibold text-amber-800">
								⚠️ Unassigned Stops ({optimizationResult.unassigned.length})
							</h4>
							<ul class="space-y-1 text-sm text-amber-700">
								{#each optimizationResult.unassigned as stop}
									<li>• Stop {stop.stopId}: {stop.reason || 'Unknown reason'}</li>
								{/each}
							</ul>
						</div>
					{/if}

					<!-- Full JSON Result -->
					<details class="rounded-lg border bg-muted p-4">
						<summary class="cursor-pointer font-semibold">View Full JSON Result</summary>
						<pre
							class="mt-4 overflow-auto rounded bg-black p-4 text-xs text-green-400">{JSON.stringify(
								optimizationResult,
								null,
								2
							)}</pre>
					</details>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Optimization Error -->
	{#if optimizationError}
		<Card class="mb-8 border-destructive">
			<CardContent class="pt-6">
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					<strong>Optimization Error:</strong>
					{optimizationError}
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Map View -->
	{#if data.stops.length > 0}
		<div class="mb-8">
			<MapView stops={data.stops} />
		</div>
	{/if}

	<!-- Drivers Section -->
	<Card class="mb-8">
		<CardHeader>
			<div class="flex items-center justify-between">
				<div>
					<CardTitle class="flex items-center gap-2">
						<Truck class="h-5 w-5 text-primary" />
						Drivers
					</CardTitle>
					<CardDescription>
						{#if isViewMode}
							Drivers assigned to this optimized map
						{:else}
							Assign drivers to this map for route optimization
						{/if}
					</CardDescription>
				</div>
				{#if !isViewMode}
					<div class="flex gap-2">
						<!-- Combobox for selecting existing driver -->
						<Popover.Root bind:open>
							<Popover.Trigger
								disabled={isLoading}
								class="flex h-9 w-[280px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							>
								{isLoading
									? 'Loading...'
									: selectedDriver
										? selectedDriver.name
										: 'Select driver...'}
								<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Popover.Trigger>
							<Popover.Content class="w-[280px] p-0">
								<Command.Root>
									<Command.Input placeholder="Search drivers..." />
									<Command.Empty>No driver found.</Command.Empty>
									<Command.Group>
										{#each data.allDrivers?.filter((d) => !d.temporary) || [] as driver}
											<Command.Item
												value={driver.id}
												onselect={() => {
													value = driver.id;
													addExistingDriver();
												}}
											>
												<Check
													class={value === driver.id ? 'mr-2 h-4 w-4' : 'mr-2 h-4 w-4 opacity-0'}
												/>
												<div class="flex flex-col">
													<span>{driver.name}</span>
													{#if driver.phone}
														<span class="text-xs text-muted-foreground">{driver.phone}</span>
													{/if}
												</div>
											</Command.Item>
										{/each}
									</Command.Group>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>

						<!-- Popover to create temporary driver -->
						<Popover.Root bind:open={openNewDriver}>
							<Popover.Trigger>
								<Button variant="outline" disabled={isLoading}>
									<UserPlus class="mr-2 h-4 w-4" />
									Temporary Driver
								</Button>
							</Popover.Trigger>
							<Popover.Content class="w-80">
								<div class="space-y-4">
									<div class="space-y-2">
										<h4 class="leading-none font-medium">Create Temporary Driver</h4>
										<p class="text-sm text-muted-foreground">
											Add a one-time driver with an auto-generated name
										</p>
									</div>
									<div class="space-y-3">
										<div class="space-y-2">
											<Label for="temp-driver-name">Driver Name</Label>
											<Input
												id="temp-driver-name"
												type="text"
												bind:value={newDriverName}
												placeholder="driver-123456"
												disabled={isLoading}
											/>
										</div>
										<div class="space-y-2">
											<Label for="temp-driver-phone">Phone Number (optional)</Label>
											<Input
												id="temp-driver-phone"
												type="tel"
												placeholder="Enter phone number"
												bind:value={newDriverPhone}
												disabled={isLoading}
											/>
										</div>
										<Button
											class="w-full"
											onclick={addTemporaryDriver}
											disabled={!newDriverName.trim() || isLoading}
										>
											<Plus class="mr-2 h-4 w-4" />
											{isLoading ? 'Creating...' : 'Create and Add'}
										</Button>
									</div>
								</div>
							</Popover.Content>
						</Popover.Root>
					</div>
				{/if}
			</div>
		</CardHeader>
		<CardContent class="space-y-4">
			<!-- View Mode Info -->
			{#if isViewMode}
				<div class="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
					<strong>View Mode:</strong> Routes have been optimized. Switch to Edit Mode to make changes
					to drivers or stops.
				</div>
			{/if}

			<!-- Error Message -->
			{#if errorMessage}
				<div
					class="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
				>
					{errorMessage}
				</div>
			{/if}

			<!-- Drivers Table -->
			{#if isViewMode}
				<ViewDriversTable assignedDrivers={data.assignedDrivers} isOptimized={data.isViewMode} />
			{:else}
				<EditDriversTable
					assignedDrivers={data.assignedDrivers}
					{isLoading}
					onRemoveDriver={removeDriver}
				/>
			{/if}
		</CardContent>
	</Card>

	<!-- Stops Table -->
	{#if isViewMode}
		<ViewStopsTable stops={data.stops} />
	{:else}
		<EditStopsTable stops={data.stops} />
	{/if}
</div>

<style>
	:global(body) {
		background: linear-gradient(to bottom right, hsl(var(--background)), hsl(var(--muted)));
		min-height: 100vh;
	}
</style>
