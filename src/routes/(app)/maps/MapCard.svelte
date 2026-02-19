<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ConfirmDeleteDialog } from '$lib/components/ConfirmDeleteDialog';
	import DropdownMetadataLabel from '$lib/components/DropdownMetadataLabel.svelte';
	import EditOrCreateMapPopover from '$lib/components/EditOrCreateMapPopover';
	import MapBoxStaticMap from '$lib/components/MapBoxStaticMap.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type {
		Driver,
		Map as MapType,
		Route,
		StopWithLocation
	} from '$lib/schemas';
	import { mapApi } from '$lib/services/api';
	import { formatDate } from '$lib/utils';
	import {
		Calendar,
		ChevronRight,
		Clock,
		Copy,
		Map,
		MapPin,
		MoreHorizontal,
		Pencil,
		Trash2,
		Truck
	} from 'lucide-svelte';
	import { CheckCircle, CircleDashed, WarningCircle } from 'phosphor-svelte';
	import { toast } from 'svelte-sonner';

	let {
		map,
		stops,
		routes,
		drivers = [],
		driverCount,
		showThumbnail = true
	}: {
		map: MapType;
		stops: StopWithLocation[];
		routes: Route[];
		drivers?: Driver[];
		driverCount: number;
		showThumbnail?: boolean;
	} = $props();

	type RoutingStatus = 'none' | 'unrouted' | 'partial' | 'routed';
	const routingStatus: RoutingStatus = $derived.by(() => {
		if (stops.length === 0) return 'none';
		const routedCount = stops.filter(
			(s) => s.stop.driver_id !== null && s.stop.delivery_index !== null
		).length;
		if (routedCount === 0) return 'unrouted';
		if (routedCount === stops.length) return 'routed';
		return 'partial';
	});

	const routingTooltip = $derived(
		routingStatus === 'routed'
			? 'All stops routed'
			: routingStatus === 'partial'
				? 'Some stops not yet routed'
				: routingStatus === 'unrouted'
					? 'No stops routed'
					: ''
	);

	const totalDuration = $derived(() => {
		const total = routes.reduce((acc, r) => {
			const duration = r.duration ? parseFloat(r.duration) : 0;
			return acc + duration;
		}, 0);
		if (total === 0) return null;
		const hours = Math.floor(total / 3600);
		const minutes = Math.floor((total % 3600) / 60);
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	});

	function handleCopyId(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		navigator.clipboard.writeText(map.id);
		toast.success('Map ID copied to clipboard');
	}

	async function handleDelete() {
		await mapApi.delete(map.id);
		toast.success('Map deleted');
		await invalidateAll();
	}
</script>

<a
	href={resolve(`/maps/${map.id}`)}
	class="group flex flex-col overflow-hidden rounded-lg border border-border/50 bg-card transition-all hover:border-border hover:shadow-sm sm:flex-row"
>
	<!-- Map Thumbnail -->
	{#if showThumbnail}
		<div
			class="relative h-32 shrink-0 overflow-hidden bg-muted sm:h-auto sm:w-32 md:w-42 lg:w-72"
		>
			{#if stops.length > 0}
				<MapBoxStaticMap mapId={map.id} {stops} {drivers} />
			{:else}
				<div class="flex h-full w-full items-center justify-center bg-muted">
					<Map class="h-8 w-8 text-muted-foreground/50" />
				</div>
			{/if}
		</div>
	{/if}

	<!-- Content -->
	<div class="flex min-w-0 flex-1 items-center justify-between gap-4 p-4">
		<div class="flex min-w-0 flex-1 items-center gap-4">
			<!-- Map info -->
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<Tooltip.Provider>
						<Tooltip.Root>
							<Tooltip.Trigger>
								{#if routingStatus === 'routed'}
									<CheckCircle
										size={16}
										weight="fill"
										class="shrink-0 text-muted-foreground"
									/>
								{:else if routingStatus === 'partial'}
									<WarningCircle
										size={16}
										weight="fill"
										class="shrink-0 text-muted-foreground"
									/>
								{:else}
									<CircleDashed
										size={16}
										class="shrink-0 text-muted-foreground"
									/>
								{/if}
							</Tooltip.Trigger>
							{#if routingTooltip}
								<Tooltip.Content>{routingTooltip}</Tooltip.Content>
							{/if}
						</Tooltip.Root>
					</Tooltip.Provider>
					<h3 class="truncate font-medium group-hover:text-primary">
						{map.title}
					</h3>
				</div>
				<div
					class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground"
				>
					<span class="flex items-center gap-1.5">
						<MapPin class="h-3.5 w-3.5" />
						{stops.length} stop{stops.length !== 1 ? 's' : ''}
					</span>
					{#if driverCount > 0}
						<span class="flex items-center gap-1.5">
							<Truck class="h-3.5 w-3.5" />
							{driverCount} driver{driverCount !== 1 ? 's' : ''}
						</span>
					{/if}
					{#if totalDuration()}
						<span class="flex items-center gap-1.5">
							<Clock class="h-3.5 w-3.5" />
							{totalDuration()}
						</span>
					{/if}
					<span class="flex items-center gap-1.5">
						<Calendar class="h-3.5 w-3.5" />
						{formatDate(map.created_at)}
					</span>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="flex shrink-0 items-center gap-2">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<Button
						variant="ghost"
						size="icon"
						class="h-8 w-8"
						onclick={(e) => e.preventDefault()}
					>
						<MoreHorizontal class="h-4 w-4" />
					</Button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					<EditOrCreateMapPopover
						mode="edit"
						{map}
						onSuccess={() => invalidateAll()}
						triggerClass="w-full"
					>
						{#snippet children({ props })}
							<DropdownMenu.ActionButton {...props}>
								<Pencil />
								Edit
							</DropdownMenu.ActionButton>
						{/snippet}
					</EditOrCreateMapPopover>
					<DropdownMenu.Item onclick={handleCopyId}>
						<Copy class="mr-2 h-4 w-4" />
						<div class="text-muted-foreground">Copy ID</div>
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<ConfirmDeleteDialog
						description="Are you sure you want to delete this map? This action cannot be undone."
						onConfirm={handleDelete}
					>
						{#snippet trigger({ props })}
							<DropdownMenu.ActionButton {...props} variant="destructive">
								<Trash2 />
								Delete
							</DropdownMenu.ActionButton>
						{/snippet}
					</ConfirmDeleteDialog>
					<DropdownMetadataLabel item={map} />
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<ChevronRight
				class="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
			/>
		</div>
	</div>
</a>
