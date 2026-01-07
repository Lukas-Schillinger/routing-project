<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import EditOrCreateMapPopover from '$lib/components/EditOrCreateMapPopover';
	import MapBoxStaticMap from '$lib/components/MapBoxStaticMap.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import type { Driver, Map as MapType, Route, StopWithLocation } from '$lib/schemas';
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
		Route as RouteIcon,
		Trash2,
		Truck
	} from 'lucide-svelte';
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

	const isRouted = $derived(
		stops.length > 0 &&
			stops.every((s) => s.stop.driver_id !== null && s.stop.delivery_index !== null)
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

	async function handleDelete(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		if (!confirm('Are you sure you want to delete this map?')) return;
		try {
			await mapApi.delete(map.id);
			toast.success('Map deleted');
			await invalidateAll();
		} catch (error) {
			toast.error('Failed to delete map');
		}
	}
</script>

<a
	href="/maps/{map.id}"
	class="group flex flex-col overflow-hidden rounded-lg border border-border/50 bg-card transition-all hover:border-border hover:shadow-sm sm:flex-row"
>
	<!-- Map Thumbnail -->
	{#if showThumbnail}
		<div class="relative h-32 shrink-0 overflow-hidden bg-muted sm:h-auto sm:w-32 md:w-42 lg:w-72">
			{#if stops.length > 0}
				<MapBoxStaticMap mapId={map.id} {stops} {drivers} />
			{:else}
				<div class="flex h-full w-full items-center justify-center bg-muted">
					<Map class="h-8 w-8 text-muted-foreground/50" />
				</div>
			{/if}
			<!-- Status overlay -->
			<div class="absolute top-2 left-2 sm:hidden">
				{#if isRouted}
					<Badge variant="default" class="bg-primary text-primary-foreground">Routed</Badge>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Content -->
	<div class="flex min-w-0 flex-1 items-center justify-between gap-4 p-4">
		<div class="flex min-w-0 flex-1 items-center gap-4">
			<!-- Status indicator (desktop) -->
			{#if !showThumbnail}
				<div class="hidden sm:block">
					{#if isRouted}
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
							<RouteIcon class="h-5 w-5 text-primary" />
						</div>
					{:else}
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
							<MapPin class="h-5 w-5 text-muted-foreground" />
						</div>
					{/if}
				</div>
			{/if}

			<!-- Map info -->
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<h3 class="truncate font-medium group-hover:text-primary">
						{map.title}
					</h3>
					{#if isRouted && showThumbnail}
						<Badge
							variant="default"
							class="hidden shrink-0 bg-primary text-primary-foreground sm:inline-flex"
							>Routed</Badge
						>
					{:else if isRouted}
						<Badge variant="default" class=" shrink-0 sm:inline-flex">Routed</Badge>
					{/if}
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
					<Button variant="ghost" size="icon" class="h-8 w-8 " onclick={(e) => e.preventDefault()}>
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
							<button
								{...props}
								class="relative flex w-full cursor-default items-center rounded-sm px-2 py-1.5 text-sm text-muted-foreground outline-none select-none hover:bg-accent hover:text-accent-foreground"
							>
								<Pencil class="mr-4 h-4 w-4" />
								Edit
							</button>
						{/snippet}
					</EditOrCreateMapPopover>
					<DropdownMenu.Item onclick={handleCopyId}>
						<Copy class="mr-2 h-4 w-4" />
						<div class="text-muted-foreground">Copy ID</div>
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<DropdownMenu.Item class="text-destructive" onclick={handleDelete}>
						<Trash2 class="mr-2 h-4 w-4" />
						Delete
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<ChevronRight
				class="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
			/>
		</div>
	</div>
</a>
