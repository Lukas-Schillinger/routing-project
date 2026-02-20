<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import EditOrCreateDriverPopover from '$lib/components/EditOrCreateDriverPopover';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import type { Driver } from '$lib/schemas/driver';
	import { driverApi } from '$lib/services/api/drivers';
	import { formatPhoneNumber, getIdenticon } from '$lib/utils';
	import { ChevronRight, Phone, Plus, Truck, Users } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let { drivers = $bindable([]) }: { drivers: Driver[] } = $props();

	async function handleDriverSuccess() {
		await invalidateAll();
	}

	async function handleDelete(driver: Driver) {
		await driverApi.delete(driver.id);
		drivers = drivers.filter((d) => d.id !== driver.id);
		toast.success('Driver deleted');
	}
</script>

<div class="overflow-hidden rounded-lg border border-border/50 bg-card">
	<!-- Header -->
	<div
		class="flex items-center justify-between border-b border-border/50 px-4 py-3"
	>
		<div class="flex items-center gap-2">
			<Truck class="h-4 w-4 text-muted-foreground" />
			<h3 class="text-sm font-medium">Drivers</h3>
			{#if drivers.length > 0}
				<Badge variant="secondary" class="ml-1 h-5 px-1.5 text-xs">
					{drivers.length}
				</Badge>
			{/if}
		</div>
		<EditOrCreateDriverPopover mode="create" onSuccess={handleDriverSuccess}>
			{#snippet children({ props })}
				<Button
					{...props}
					variant="ghost"
					size="icon"
					class="h-7 w-7"
					aria-label="Add driver"
				>
					<Plus class="h-4 w-4" />
				</Button>
			{/snippet}
		</EditOrCreateDriverPopover>
	</div>

	<!-- Content -->
	<div class="p-2">
		{#if drivers.length === 0}
			<div class="flex flex-col items-center justify-center py-8 text-center">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
				>
					<Users class="h-5 w-5 text-muted-foreground" />
				</div>
				<p class="mt-3 text-sm font-medium">No drivers yet</p>
				<p class="mt-1 text-xs text-muted-foreground">
					Add drivers to assign them to routes
				</p>
				<EditOrCreateDriverPopover
					mode="create"
					onSuccess={handleDriverSuccess}
				>
					{#snippet children({ props })}
						<Button {...props} variant="outline" size="sm" class="mt-3 gap-1">
							<Plus class="h-3.5 w-3.5" />
							Add Driver
						</Button>
					{/snippet}
				</EditOrCreateDriverPopover>
			</div>
		{:else}
			<div
				class="flex flex-col gap-2 sm:grid sm:grid-cols-2 md:flex md:flex-col"
			>
				{#each drivers.slice(0, 5) as driver (driver.id)}
					<EditOrCreateDriverPopover
						triggerClass="block w-full min-w-0 overflow-hidden"
						mode="edit"
						{driver}
						onSuccess={handleDriverSuccess}
						onDelete={() => handleDelete(driver)}
					>
						{#snippet children({ props })}
							<button
								{...props}
								type="button"
								class="group flex w-full max-w-full cursor-pointer items-center gap-3 overflow-hidden rounded-md px-2 py-2 text-left transition-colors hover:bg-accent/50"
							>
								<Avatar.Root class="h-8 w-8 shrink-0 border border-border/50">
									<Avatar.Image src={getIdenticon(driver)} alt={driver.name} />
									<Avatar.Fallback class="text-xs">
										{driver.name.slice(0, 2).toUpperCase()}
									</Avatar.Fallback>
								</Avatar.Root>
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium">{driver.name}</p>
									{#if driver.phone}
										<p
											class="flex items-center gap-1 text-xs text-muted-foreground"
										>
											<Phone class="h-3 w-3 shrink-0" />
											{formatPhoneNumber(driver.phone)}
										</p>
									{/if}
								</div>
							</button>
						{/snippet}
					</EditOrCreateDriverPopover>
				{/each}
			</div>

			{#if drivers.length > 5}
				<div class="mt-2 border-t border-border/50 pt-2">
					<Button
						variant="ghost"
						size="sm"
						class="w-full justify-between text-xs"
					>
						<span>View all {drivers.length} drivers</span>
						<ChevronRight class="h-3.5 w-3.5" />
					</Button>
				</div>
			{/if}
		{/if}
	</div>
</div>
