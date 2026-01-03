<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import EditOrCreateDriverPopover from '$lib/components/EditOrCreateDriverPopover';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Command from '$lib/components/ui/command';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Empty from '$lib/components/ui/empty';
	import * as Popover from '$lib/components/ui/popover';
	import type { Driver } from '$lib/schemas/driver';
	import { ApiError, mapApi } from '$lib/services/api';
	import { getIdenticon } from '$lib/utils';
	import { Copy, Ellipsis, Pencil, Phone, Plus, Trash2, Truck, UserPlus } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let {
		assignedDrivers,
		allDrivers,
		mapId,
		onRemoveDriver
	}: {
		assignedDrivers: Driver[];
		allDrivers: Driver[];
		mapId: string;
		onRemoveDriver: (driverId: string) => void;
	} = $props();

	let addPopoverOpen = $state(false);
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
			addPopoverOpen = false;
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

	function handleDriverCreated() {
		addPopoverOpen = false;
		invalidateAll();
	}
</script>

<div class="flex h-full flex-col">
	<!-- Summary Header -->
	<div class="flex items-center justify-between border-b border-border/50 py-3">
		<div class="flex items-center gap-1.5 text-sm text-muted-foreground">
			<Truck class="h-3.5 w-3.5" />
			<span>{assignedDrivers.length} driver{assignedDrivers.length !== 1 ? 's' : ''}</span>
		</div>

		<Popover.Root bind:open={addPopoverOpen}>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" class="gap-1.5 px-2">
						<Plus class="h-3.5 w-3.5" />
						Add Driver
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-[260px] p-0" align="end">
				<Command.Root>
					<Command.Input placeholder="Search existing drivers..." disabled={localIsLoading} />
					<Command.Empty>No drivers found.</Command.Empty>
					{#if availableDrivers.length > 0}
						<Command.Group heading="Existing Drivers">
							{#each availableDrivers as driver}
								<Command.Item
									value={driver.name}
									onSelect={() => addExistingDriver(driver.id)}
									disabled={localIsLoading}
								>
									<div class="flex items-center gap-2">
										<Avatar.Root class="h-6 w-6">
											<Avatar.Image src={getIdenticon(driver)} alt={driver.name} />
											<Avatar.Fallback class="text-xs">
												{driver.name.slice(0, 2).toUpperCase()}
											</Avatar.Fallback>
										</Avatar.Root>
										<span class="truncate">{driver.name}</span>
									</div>
								</Command.Item>
							{/each}
						</Command.Group>
					{/if}
					<Command.Separator />
					<Command.Group heading="Create New">
						<EditOrCreateDriverPopover mode="create" {mapId} onSuccess={handleDriverCreated}>
							{#snippet children({ props })}
								<button
									{...props}
									type="button"
									class="relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground"
								>
									<UserPlus class="h-4 w-4" />
									Create new driver
								</button>
							{/snippet}
						</EditOrCreateDriverPopover>
						<EditOrCreateDriverPopover
							mode="create"
							{mapId}
							temporaryDriver={true}
							onSuccess={handleDriverCreated}
						>
							{#snippet children({ props })}
								<button
									{...props}
									type="button"
									class="relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground outline-none select-none hover:bg-accent hover:text-accent-foreground"
								>
									<Plus class="h-4 w-4" />
									Create temporary driver
								</button>
							{/snippet}
						</EditOrCreateDriverPopover>
					</Command.Group>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	</div>

	<!-- Driver List -->
	<div class="flex-1 space-y-2 overflow-auto py-4">
		{#if assignedDrivers.length === 0}
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon">
						<Truck />
					</Empty.Media>
					<Empty.Title>No drivers yet</Empty.Title>
					<Empty.Description>Add your first driver to get started</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		{:else}
			{#each assignedDrivers as driver (driver.id)}
				<div
					class="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-accent/30"
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
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button {...props} variant="ghost" size="icon" class="h-7 w-7">
									<Ellipsis class="h-4 w-4" />
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<EditOrCreateDriverPopover
								triggerClass="block w-full"
								mode="edit"
								{driver}
								{mapId}
								onSuccess={() => invalidateAll()}
							>
								{#snippet children({ props })}
									<button
										{...props}
										type="button"
										class="relative flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground"
									>
										<Pencil class="mr-2 h-4 w-4" />
										Edit
									</button>
								{/snippet}
							</EditOrCreateDriverPopover>
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
