<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Command from '$lib/components/ui/command';
	import * as Empty from '$lib/components/ui/empty';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Popover from '$lib/components/ui/popover';
	import * as Table from '$lib/components/ui/table';
	import type { Driver } from '$lib/schemas/driver';
	import { ApiError, driverApi, mapApi } from '$lib/services/api';
	import { generateRandomColor, getIdenticon } from '$lib/utils';
	import { ChevronsUpDown, Phone, Plus, RefreshCw, Trash2, Truck, UserPlus } from 'lucide-svelte';

	interface Props {
		assignedDrivers: Driver[];
		allDrivers: Driver[];
		mapId: string;
		isLoading?: boolean;
		onRemoveDriver: (driverId: string) => void;
	}

	let { assignedDrivers, allDrivers, mapId, isLoading = false, onRemoveDriver }: Props = $props();

	// Local state
	let open = $state(false);
	let openNewDriver = $state(false);
	let newDriverPhone = $state('');
	let localIsLoading = $state(false);
	let errorMessage = $state('');

	// Get available drivers (non-temporary, not already assigned)
	function getExistingDriverOptions(all: Driver[], assigned: Driver[]): Driver[] {
		const assignedDriverIds = new Set(assigned.map((d) => d.id));
		return all.filter((driver) => !driver.temporary && !assignedDriverIds.has(driver.id));
	}

	// Derived state for available drivers
	const availableDrivers = $derived(getExistingDriverOptions(allDrivers, assignedDrivers));

	// Generate random driver name
	function generateDriverName(): string {
		const randomNum = Math.floor(Math.random() * 10000)
			.toString()
			.padStart(4, '0');
		return `driver-${randomNum}`;
	}

	let newDriverName = $state(generateDriverName());
	let newDriverColor = $state(generateRandomColor());

	// Close and reset the combobox
	function closeAndReset() {
		open = false;
		errorMessage = '';
	}

	async function addExistingDriver(driverId: string) {
		if (localIsLoading) return;

		localIsLoading = true;
		errorMessage = '';

		try {
			// Assign the driver to this map
			await mapApi.addDriver(mapId, driverId);

			// Refresh the page data
			await invalidateAll();
			closeAndReset();
		} catch (err) {
			errorMessage = err instanceof ApiError ? err.message : 'Failed to assign driver';
			console.error('Error assigning driver:', err);
		} finally {
			localIsLoading = false;
		}
	}

	async function addTemporaryDriver() {
		if (!newDriverName.trim() || localIsLoading) return;

		localIsLoading = true;
		errorMessage = '';

		try {
			// First, create the temporary driver
			const newDriver = await driverApi.create({
				name: newDriverName.trim(),
				phone: newDriverPhone.trim() || null,
				color: newDriverColor,
				temporary: true,
				active: true
			});

			// Then assign the driver to this map
			await mapApi.addDriver(mapId, newDriver.id);

			// Refresh the page data
			await invalidateAll();

			// Reset form
			newDriverName = generateDriverName();
			newDriverColor = generateRandomColor();
			newDriverPhone = '';
			openNewDriver = false;
			errorMessage = '';
		} catch (err) {
			errorMessage = err instanceof ApiError ? err.message : 'Failed to create temporary driver';
			console.error('Error creating temporary driver:', err);
		} finally {
			localIsLoading = false;
		}
	}
</script>

<div class="space-y-4">
	<!-- Action Buttons -->
	<div class="flex items-center justify-start gap-2">
		<!-- Combobox for selecting existing driver -->
		<Popover.Root bind:open>
			<Popover.Trigger
				disabled={localIsLoading || isLoading}
				class="flex w-40 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
			>
				Add driver...
				<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
			</Popover.Trigger>
			<Popover.Content class="w-[280px] p-0">
				<Command.Root>
					<Command.Input placeholder="Search drivers..." />
					<Command.Empty>No driver found.</Command.Empty>
					<Command.Group>
						{#each availableDrivers as driver}
							<Command.Item
								value={driver.name}
								onSelect={() => {
									addExistingDriver(driver.id);
								}}
							>
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
				<Button variant="outline" disabled={localIsLoading || isLoading}>
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
								disabled={true}
							/>
						</div>
						<div class="space-y-2">
							<Label for="driver-color">Color</Label>
							<div class="flex gap-2">
								<Input type="color" id="driver-color" bind:value={newDriverColor} />
								<Button
									onclick={() => (newDriverColor = generateRandomColor())}
									variant="ghost"
									size="icon"><RefreshCw /></Button
								>
							</div>
						</div>
						<div class="space-y-2">
							<Label for="temp-driver-phone">Phone Number (optional)</Label>
							<Input
								id="temp-driver-phone"
								type="tel"
								placeholder="Enter phone number"
								bind:value={newDriverPhone}
								disabled={localIsLoading}
							/>
						</div>
						<Button
							class="w-full"
							onclick={addTemporaryDriver}
							disabled={!newDriverName.trim() || localIsLoading}
						>
							<Plus class="mr-2 h-4 w-4" />
							{localIsLoading ? 'Creating...' : 'Create and Add'}
						</Button>
					</div>
				</div>
			</Popover.Content>
		</Popover.Root>
	</div>

	<!-- Error Message -->
	{#if errorMessage}
		<div
			class="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
		>
			{errorMessage}
		</div>
	{/if}

	<!-- Table -->
	{#if assignedDrivers.length > 0}
		<div class="">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-10"></Table.Head>
						<Table.Head>Driver</Table.Head>
						<Table.Head>Phone</Table.Head>
						<Table.Head>Type</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each assignedDrivers as driver}
						<Table.Row>
							<Table.Cell>
								<Avatar.Root>
									<Avatar.Image src={getIdenticon(driver)} alt="@shadcn" />
									<Avatar.Fallback>CN</Avatar.Fallback>
								</Avatar.Root>
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center">
									<span class="font-semibold">{driver.name || 'Unassigned'}</span>
								</div>
							</Table.Cell>
							<Table.Cell>
								{#if driver.phone}
									<div class="flex items-center text-sm">
										<Phone class="mr-2 h-3 w-3 text-primary" />
										{driver.phone}
									</div>
								{:else}
									<span class="text-sm text-muted-foreground">—</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								{#if driver.temporary}
									<Badge variant="secondary">Temporary</Badge>
								{:else}
									<Badge variant="outline">Permanent</Badge>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-right">
								<Button
									variant="ghost"
									size="sm"
									onclick={() => onRemoveDriver(driver.id)}
									disabled={isLoading || localIsLoading}
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
		<Empty.Root>
			<Empty.Media variant="icon">
				<Truck />
			</Empty.Media>
			<Empty.Content>
				<Empty.Title>No drivers assigned yet</Empty.Title>
				<Empty.Description>Add drivers to this map to start planning routes.</Empty.Description>
			</Empty.Content>
		</Empty.Root>
	{/if}
</div>
