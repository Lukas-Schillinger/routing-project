<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import EditOrCreateDriverPopover from '$lib/components/EditOrCreateDriverPopover';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Command from '$lib/components/ui/command';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Popover from '$lib/components/ui/popover';
	import type { Driver } from '$lib/schemas/driver';
	import { ApiError, mapApi } from '$lib/services/api';
	import { getIdenticon } from '$lib/utils';
	import { ChevronsUpDown, Copy, MoreHorizontal, Phone, Plus, Trash2, Truck } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let {
		assignedDrivers,
		allDrivers,
		mapId,
		isLoading = false,
		onRemoveDriver
	}: {
		assignedDrivers: Driver[];
		allDrivers: Driver[];
		mapId: string;
		isLoading?: boolean;
		onRemoveDriver: (routeId: string) => void;
	} = $props();

	let open = $state(false);
	let localIsLoading = $state(false);

	// Get available drivers (non-temporary, not already assigned)
	const availableDrivers = $derived.by(() => {
		const assignedDriverIds = new Set(assignedDrivers.map((d) => d.id));
		return allDrivers.filter((driver) => !driver.temporary && !assignedDriverIds.has(driver.id));
	});

	async function addExistingDriver(driverId: string) {
		if (localIsLoading) return;

		localIsLoading = true;

		try {
			await mapApi.addDriver(mapId, driverId);
			await invalidateAll();
			open = false;
		} catch (err) {
			const message = err instanceof ApiError ? err.message : 'Failed to assign driver';
			toast.error('Error adding driver', { description: message });
		} finally {
			localIsLoading = false;
		}
	}

	function handleCopyId(id: string) {
		navigator.clipboard.writeText(id);
		toast.success('Driver ID copied');
	}
</script>

<div class="flex h-full flex-col">
	<!-- Add Driver Controls -->
	<div class="mb-4 flex flex-wrap gap-2">
		<!-- Add existing driver combobox -->
		<Popover.Root bind:open>
			<Popover.Trigger
				disabled={localIsLoading || isLoading || availableDrivers.length === 0}
				class="flex items-center gap-2 rounded-md border border-border/50 bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<Plus class="h-3.5 w-3.5" />
				Add existing
				<ChevronsUpDown class="h-3.5 w-3.5 opacity-50" />
			</Popover.Trigger>
			<Popover.Content class="w-[240px] p-0">
				<Command.Root>
					<Command.Input placeholder="Search drivers..." />
					<Command.Empty>No drivers found.</Command.Empty>
					<Command.Group>
						{#each availableDrivers as driver}
							<Command.Item value={driver.name} onSelect={() => addExistingDriver(driver.id)}>
								<div class="flex items-center gap-2">
									<Avatar.Root class="h-6 w-6">
										<Avatar.Image src={getIdenticon(driver)} alt={driver.name} />
										<Avatar.Fallback class="text-xs">
											{driver.name.slice(0, 2).toUpperCase()}
										</Avatar.Fallback>
									</Avatar.Root>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm">{driver.name}</p>
									</div>
								</div>
							</Command.Item>
						{/each}
					</Command.Group>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>

		<!-- Create new driver -->
		<EditOrCreateDriverPopover mode="create" {mapId} onSuccess={() => invalidateAll()}>
			<Button variant="outline" size="sm" class="gap-1.5">
				<Plus class="h-3.5 w-3.5" />
				Create driver
			</Button>
		</EditOrCreateDriverPopover>

		<!-- Create temporary driver -->
		<EditOrCreateDriverPopover
			mode="create"
			{mapId}
			temporaryDriver={true}
			onSuccess={() => invalidateAll()}
		>
			<Button variant="ghost" size="sm" class="gap-1.5 text-muted-foreground">
				<Plus class="h-3.5 w-3.5" />
				Temporary
			</Button>
		</EditOrCreateDriverPopover>
	</div>

	<!-- Driver List -->
	<div class="flex-1 space-y-2 overflow-auto">
		{#if assignedDrivers.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-center">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
					<Truck class="h-5 w-5 text-muted-foreground" />
				</div>
				<p class="mt-3 text-sm font-medium">No drivers assigned</p>
				<p class="mt-1 text-xs text-muted-foreground">Add drivers to optimize routes</p>
			</div>
		{:else}
			{#each assignedDrivers as driver (driver.id)}
				<div
					class="group flex items-center gap-3 rounded-md border border-border/50 p-3 transition-colors hover:bg-accent/30"
				>
					<Avatar.Root class="h-9 w-9 border border-border/50">
						<Avatar.Image src={getIdenticon(driver)} alt={driver.name} />
						<Avatar.Fallback class="text-xs">
							{driver.name.slice(0, 2).toUpperCase()}
						</Avatar.Fallback>
					</Avatar.Root>

					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<p class="truncate text-sm font-medium">{driver.name}</p>
							{#if driver.temporary}
								<Badge variant="secondary" class="h-4 px-1 text-[10px]">Temp</Badge>
							{/if}
						</div>
						{#if driver.phone}
							<p class="flex items-center gap-1 text-xs text-muted-foreground">
								<Phone class="h-3 w-3" />
								{driver.phone}
							</p>
						{/if}
					</div>

					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							class="inline-flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent"
						>
							<MoreHorizontal class="h-4 w-4" />
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Item onclick={() => handleCopyId(driver.id)}>
								<Copy class="mr-2 h-4 w-4" />
								Copy ID
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item class="text-destructive" onclick={() => onRemoveDriver(driver.id)}>
								<Trash2 class="mr-2 h-4 w-4" />
								Remove
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			{/each}
		{/if}
	</div>
</div>
