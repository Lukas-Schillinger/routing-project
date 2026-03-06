<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import { ServiceError } from '$lib/errors';
	import type { Driver } from '$lib/schemas/driver';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { stopApi } from '$lib/services/api';
	import { getIdenticon } from '$lib/utils';
	import Check from '@lucide/svelte/icons/check';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import { toast } from 'svelte-sonner';

	type Props = {
		stop: StopWithLocation;
		stops: StopWithLocation[];
		drivers: Driver[];
		onDriverChange?: (stop: StopWithLocation) => void;
	};

	let { stop, stops, drivers, onDriverChange }: Props = $props();

	let open = $state(false);
	let isLoading = $state(false);

	const assignedDriver = $derived(
		stop.stop.driver_id
			? drivers.find((d) => d.id === stop.stop.driver_id)
			: null
	);

	function getNextDeliveryIndex(driverId: string): number {
		const driverStops = stops.filter((s) => s.stop.driver_id === driverId);
		if (driverStops.length === 0) return 1;

		const maxIndex = Math.max(
			...driverStops.map((s) => s.stop.delivery_index ?? 0)
		);
		return maxIndex + 1;
	}

	async function assignDriver(driverId: string | null) {
		if (isLoading) return;

		isLoading = true;

		try {
			const updatedStop = await stopApi.update(stop.stop.id, {
				driver_id: driverId,
				delivery_index: driverId ? getNextDeliveryIndex(driverId) : null
			});
			onDriverChange?.(updatedStop);
			open = false;
			toast.success(driverId ? 'Driver assigned' : 'Driver removed');
		} catch (err) {
			const message =
				err instanceof ServiceError ? err.message : 'Failed to update driver';
			toast.error('Error', { description: message });
		} finally {
			isLoading = false;
		}
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				class="flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
				disabled={isLoading}
			>
				{#if assignedDriver}
					<Avatar.Root class="h-8 w-8 border border-border/50">
						<Avatar.Image
							src={getIdenticon(assignedDriver)}
							alt={assignedDriver.name}
						/>
						<Avatar.Fallback class="text-xs">
							{assignedDriver.name.slice(0, 2).toUpperCase()}
						</Avatar.Fallback>
					</Avatar.Root>
				{:else}
					<div
						class="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground/60 transition-colors hover:border-muted-foreground/60 hover:text-muted-foreground"
					>
						<Plus class="h-4 w-4" />
					</div>
				{/if}
			</button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-56 p-0" align="start">
		<Command.Root>
			<Command.Input placeholder="Search drivers…" disabled={isLoading} />
			<Command.Empty>No drivers found.</Command.Empty>
			<Command.Group>
				{#each drivers as driver (driver.id)}
					{@const isSelected = driver.id === stop.stop.driver_id}
					<Command.Item
						value={driver.name}
						onSelect={() => assignDriver(driver.id)}
						disabled={isLoading}
					>
						<div class="flex items-center gap-2">
							<Avatar.Root class="h-6 w-6">
								<Avatar.Image src={getIdenticon(driver)} alt={driver.name} />
								<Avatar.Fallback class="text-xs">
									{driver.name.slice(0, 2).toUpperCase()}
								</Avatar.Fallback>
							</Avatar.Root>
							<span class="flex-1 truncate">{driver.name}</span>
							{#if isSelected}
								<Check class="h-4 w-4 text-primary" />
							{/if}
						</div>
					</Command.Item>
				{/each}
			</Command.Group>
			{#if assignedDriver}
				<Command.Separator />
				<Command.Group>
					<Command.Item
						value="remove-driver"
						onSelect={() => assignDriver(null)}
						disabled={isLoading}
						class="text-muted-foreground"
					>
						<Minus class="h-4 w-4" />
						<span>Remove driver</span>
					</Command.Item>
				</Command.Group>
			{/if}
		</Command.Root>
	</Popover.Content>
</Popover.Root>
