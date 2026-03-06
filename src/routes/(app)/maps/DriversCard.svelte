<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { INVALIDATION_KEYS } from '$lib/invalidation-keys';
	import EditOrCreateDriverPopover from '$lib/components/EditOrCreateDriverPopover';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import type { Driver } from '$lib/schemas/driver';
	import { driverApi } from '$lib/services/api/drivers';
	import { formatPhoneNumber, getIdenticon } from '$lib/utils';
	import * as Empty from '$lib/components/ui/empty';
	import Phone from '@lucide/svelte/icons/phone';
	import Plus from '@lucide/svelte/icons/plus';
	import Truck from '@lucide/svelte/icons/truck';
	import Users from '@lucide/svelte/icons/users';
	import { toast } from 'svelte-sonner';

	let { drivers = $bindable([]) }: { drivers: Driver[] } = $props();

	async function handleDriverSuccess() {
		await invalidate(INVALIDATION_KEYS.MAPS);
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
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon"><Users /></Empty.Media>
					<Empty.Title>No drivers yet</Empty.Title>
					<Empty.Description
						>Add drivers to assign them to routes</Empty.Description
					>
				</Empty.Header>
				<EditOrCreateDriverPopover
					mode="create"
					onSuccess={handleDriverSuccess}
				>
					{#snippet children({ props })}
						<Button {...props} variant="outline" size="sm" class="gap-1">
							<Plus class="h-3.5 w-3.5" />
							Add Driver
						</Button>
					{/snippet}
				</EditOrCreateDriverPopover>
			</Empty.Root>
		{:else}
			<div
				class="flex flex-col gap-2 sm:grid sm:grid-cols-2 md:flex md:flex-col"
			>
				{#each drivers as driver (driver.id)}
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
		{/if}
	</div>
</div>
