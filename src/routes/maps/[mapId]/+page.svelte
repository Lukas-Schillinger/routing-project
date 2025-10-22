<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import MapView from '$lib/components/MapView.svelte';
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
	import * as Table from '$lib/components/ui/table';
	import { createDriver } from '$lib/services/driver-api';
	import { assignDriverToMap, removeDriverFromMap } from '$lib/services/route-api';
	import { formatDate } from '$lib/utils';
	import {
		ArrowLeft,
		Calendar,
		Check,
		ChevronsUpDown,
		FileText,
		MapPin,
		Navigation,
		Phone,
		Plus,
		Trash2,
		Truck,
		User,
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
				</div>
			</div>
			<div class="flex gap-2">
				<Button variant="outline">
					<Navigation class="mr-2 h-4 w-4" />
					Optimize Route
				</Button>
			</div>
		</div>
	</div>

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
					<CardDescription>Assign drivers to this map for route optimization</CardDescription>
				</div>
				<div class="flex gap-2">
					<!-- Combobox for selecting existing driver -->
					<Popover.Root bind:open>
						<Popover.Trigger
							disabled={isLoading}
							class="flex h-9 w-[280px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isLoading ? 'Loading...' : selectedDriver ? selectedDriver.name : 'Select driver...'}
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
			</div>
		</CardHeader>
		<CardContent class="space-y-4">
			<!-- Error Message -->
			{#if errorMessage}
				<div
					class="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
				>
					{errorMessage}
				</div>
			{/if}

			<!-- Drivers Table -->
			{#if data.assignedDrivers.length > 0}
				<div class="rounded-md border">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Driver</Table.Head>
								<Table.Head>Phone</Table.Head>
								<Table.Head>Type</Table.Head>
								<Table.Head>Stops</Table.Head>
								<Table.Head class="text-right">Actions</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.assignedDrivers as { route, driver }}
								<Table.Row>
									<Table.Cell>
										<div class="flex items-center">
											<Truck class="mr-2 h-4 w-4 flex-shrink-0 text-primary" />
											<span class="font-semibold">{driver?.name || 'Unassigned'}</span>
										</div>
									</Table.Cell>
									<Table.Cell>
										{#if driver?.phone}
											<div class="flex items-center text-sm">
												<Phone class="mr-2 h-3 w-3 text-primary" />
												{driver.phone}
											</div>
										{:else}
											<span class="text-sm text-muted-foreground">—</span>
										{/if}
									</Table.Cell>
									<Table.Cell>
										{#if driver?.temporary}
											<Badge variant="secondary">Temporary</Badge>
										{:else}
											<Badge variant="outline">Permanent</Badge>
										{/if}
									</Table.Cell>
									<Table.Cell>
										<span class="text-sm text-muted-foreground"> 0 stops </span>
									</Table.Cell>
									<Table.Cell class="text-right">
										<Button
											variant="ghost"
											size="sm"
											onclick={() => removeDriver(route.id)}
											disabled={isLoading}
										>
											<Trash2 class="h-4 w-4 text-destructive" />
										</Button>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:else}
				<div class="flex flex-col items-center justify-center py-8 text-center">
					<Truck class="mb-2 h-12 w-12 text-muted-foreground" />
					<p class="text-sm text-muted-foreground">No drivers assigned yet</p>
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Stops Table -->
	{#if data.stops.length === 0}
		<Card>
			<CardContent class="flex flex-col items-center justify-center py-16">
				<MapPin class="mb-4 h-16 w-16 text-muted-foreground" />
				<h3 class="headline-small mb-2">No Stops Yet</h3>
				<p class="body-medium text-center text-muted-foreground">
					Upload a CSV file to add stops to this map.
				</p>
			</CardContent>
		</Card>
	{:else}
		<div class="rounded-md border bg-card">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Contact</Table.Head>
						<Table.Head>Address</Table.Head>
						<Table.Head>Coordinates</Table.Head>
						<Table.Head>Confidence</Table.Head>
						<Table.Head>Phone</Table.Head>
						<Table.Head>Notes</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.stops as { stop, location }}
						<Table.Row>
							<Table.Cell>
								<div class="flex items-center">
									<User class="mr-2 h-4 w-4 flex-shrink-0 text-primary" />
									<span class="font-semibold">{stop.contact_name}</span>
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-start">
									<MapPin class="mt-0.5 mr-2 h-4 w-4 flex-shrink-0 text-primary" />
									<div class="text-sm">
										<div class="font-medium">{location.address_line1}</div>
										<div class="text-muted-foreground">
											{location.city}, {location.region}
											{location.postal_code}
										</div>
									</div>
								</div>
							</Table.Cell>
							<Table.Cell class="font-mono text-sm">
								{location.lat && location.lon
									? `${parseFloat(location.lat).toFixed(6)}, ${parseFloat(location.lon).toFixed(6)}`
									: 'N/A'}
							</Table.Cell>
							<Table.Cell>
								<Badge variant="outline">
									{location.geocode_confidence
										? parseFloat(location.geocode_confidence).toFixed(1)
										: 'N/A'}%
								</Badge>
							</Table.Cell>
							<Table.Cell>
								{#if stop.contact_phone}
									<div class="flex items-center text-sm">
										<Phone class="mr-2 h-3 w-3 text-primary" />
										{stop.contact_phone}
									</div>
								{:else}
									<span class="text-sm text-muted-foreground">—</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								{#if stop.notes}
									<div class="flex items-start text-sm">
										<FileText class="mt-0.5 mr-2 h-3 w-3 text-primary" />
										<span class="max-w-[200px] truncate">{stop.notes}</span>
									</div>
								{:else}
									<span class="text-sm text-muted-foreground">—</span>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		background: linear-gradient(to bottom right, hsl(var(--background)), hsl(var(--muted)));
		min-height: 100vh;
	}
</style>
