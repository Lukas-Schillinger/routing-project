<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { env } from '$env/dynamic/public';
	import { ConfirmDeleteDialog } from '$lib/components/ConfirmDeleteDialog';
	import DropdownMetadataLabel from '$lib/components/DropdownMetadataLabel.svelte';
	import EditOrCreateMapPopover from '$lib/components/EditOrCreateMapPopover';
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
	import { Copy, Map, MoreHorizontal, Pencil, Trash2 } from 'lucide-svelte';
	import { mode } from 'mode-watcher';
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

	// Build Mapbox static map URL for grid view (avoids nested <a> from MapBoxStaticMap)
	const gridMapUrl = $derived.by(() => {
		if (showThumbnail || stops.length === 0) return '';
		const token = env.PUBLIC_MAPBOX_STATIC_MAP_TOKEN;
		if (!token) return '';

		const style = mode.current === 'light' ? 'streets-v12' : 'dark-v11';

		let minLon = Infinity,
			minLat = Infinity,
			maxLon = -Infinity,
			maxLat = -Infinity;
		for (const stop of stops) {
			if (stop.location.lon && stop.location.lat) {
				const lon = Number(stop.location.lon);
				const lat = Number(stop.location.lat);
				minLon = Math.min(minLon, lon);
				minLat = Math.min(minLat, lat);
				maxLon = Math.max(maxLon, lon);
				maxLat = Math.max(maxLat, lat);
			}
		}
		const lonPad = (maxLon - minLon) * 0.4 || 0.01;
		const latPad = (maxLat - minLat) * 0.4 || 0.01;

		function getDriverColor(driverId: string | null): string {
			if (!driverId) return mode.current === 'light' ? '3a3a3a' : '000000';
			const driver = drivers.find((d) => d.id === driverId);
			return driver?.color ? driver.color.replace('#', '') : '000000';
		}

		const overlays = stops
			.filter((s) => s.location.lon && s.location.lat)
			.map((s) => {
				const lon = Number(s.location.lon);
				const lat = Number(s.location.lat);
				return `pin-s+${getDriverColor(s.stop.driver_id)}(${lon},${lat})`;
			})
			.join(',');

		const params = new URLSearchParams({
			access_token: token,
			attribution: 'true'
		});

		return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${overlays}/[${minLon - lonPad},${minLat - latPad},${maxLon + lonPad},${maxLat + latPad}]/600x400@2x?${params.toString()}`;
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

{#snippet statusIcon(size: number)}
	{#if routingStatus === 'routed'}
		<CheckCircle {size} weight="fill" class="shrink-0 text-muted-foreground" />
	{:else if routingStatus === 'partial'}
		<WarningCircle
			{size}
			weight="fill"
			class="shrink-0 text-muted-foreground"
		/>
	{:else}
		<CircleDashed {size} class="shrink-0 text-muted-foreground" />
	{/if}
{/snippet}

{#snippet dropdownMenu()}
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
{/snippet}

<!-- Grid view: frosted glass over full-bleed map -->
{#if !showThumbnail}
	{#if stops.length > 0}
		<a
			href={resolve(`/maps/${map.id}`)}
			class="group relative flex h-48 flex-col overflow-hidden rounded-lg"
		>
			<!-- Full-bleed map image -->
			<img
				src={gridMapUrl}
				alt="Map showing {stops.length} stops"
				class="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
			/>

			<!-- Ellipsis menu (frosted pill, top-right) -->
			<div class="absolute top-2.5 right-2.5 z-10">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						<Button
							variant="ghost"
							size="icon"
							class="h-7 w-7 rounded-full border bg-background/55 text-muted-foreground shadow backdrop-blur-lg hover:bg-background/80 hover:text-foreground"
							onclick={(e) => e.preventDefault()}
						>
							<MoreHorizontal class="h-4 w-4" />
						</Button>
					</DropdownMenu.Trigger>
					{@render dropdownMenu()}
				</DropdownMenu.Root>
			</div>

			<!-- Frosted glass info bar -->
			<div
				class="absolute inset-x-2.5 bottom-2.5 z-10 rounded-lg border bg-background/55 p-3 shadow backdrop-blur-lg"
			>
				<div class="flex items-center gap-2">
					<Tooltip.Provider>
						<Tooltip.Root>
							<Tooltip.Trigger>
								{@render statusIcon(14)}
							</Tooltip.Trigger>
							{#if routingTooltip}
								<Tooltip.Content>{routingTooltip}</Tooltip.Content>
							{/if}
						</Tooltip.Root>
					</Tooltip.Provider>
					<span class="truncate font-semibold text-foreground">
						{map.title}
					</span>
				</div>
				<div
					class="mt-1 flex items-center overflow-hidden text-xs whitespace-nowrap text-muted-foreground"
				>
					<span>{stops.length} stop{stops.length !== 1 ? 's' : ''}</span>
					{#if driverCount > 0}
						<span class="before:mx-1.5 before:content-['·']"
							>{driverCount} driver{driverCount !== 1 ? 's' : ''}</span
						>
					{/if}
					{#if totalDuration()}
						<span class="before:mx-1.5 before:content-['·']"
							>{totalDuration()}</span
						>
					{/if}
					<span class="ml-auto">
						{formatDate(map.created_at)}
					</span>
				</div>
			</div>
		</a>
	{:else}
		<!-- Empty state: no stops -->
		<a
			href={resolve(`/maps/${map.id}`)}
			class="group relative flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/30 transition-all hover:border-border hover:bg-muted/50"
		>
			<!-- Ellipsis menu (top-right) -->
			<div class="absolute top-2.5 right-2.5 z-10">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						<Button
							variant="ghost"
							size="icon"
							class="h-7 w-7 rounded-full text-muted-foreground/50 hover:text-muted-foreground"
							onclick={(e) => e.preventDefault()}
						>
							<MoreHorizontal class="h-4 w-4" />
						</Button>
					</DropdownMenu.Trigger>
					{@render dropdownMenu()}
				</DropdownMenu.Root>
			</div>

			<Map class="h-8 w-8 text-muted-foreground" />
			<p class="mt-2 text-sm font-medium text-muted-foreground">
				{map.title}
			</p>
			<p class="mt-0.5 text-xs text-muted-foreground/60">No stops added yet</p>
			<p class="mt-2 text-xs text-muted-foreground/40">
				{formatDate(map.created_at)}
			</p>
		</a>
	{/if}

	<!-- List view: compact single-line row -->
{:else}
	<a
		href={resolve(`/maps/${map.id}`)}
		class="group flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50"
	>
		<Tooltip.Provider>
			<Tooltip.Root>
				<Tooltip.Trigger>
					{@render statusIcon(16)}
				</Tooltip.Trigger>
				{#if routingTooltip}
					<Tooltip.Content>{routingTooltip}</Tooltip.Content>
				{/if}
			</Tooltip.Root>
		</Tooltip.Provider>

		<span class="min-w-0 truncate text-sm font-medium group-hover:text-primary">
			{map.title}
		</span>

		<div
			class="ml-auto flex shrink-0 items-center gap-3 text-xs text-muted-foreground"
		>
			{#if stops.length > 0}
				<span class="whitespace-nowrap">
					{stops.length} stop{stops.length !== 1 ? 's' : ''}
					{#if driverCount > 0}
						<span class="mx-1">·</span>{driverCount} driver{driverCount !== 1
							? 's'
							: ''}
					{/if}
					{#if totalDuration()}
						<span class="mx-1">·</span>{totalDuration()}
					{/if}
				</span>
			{/if}

			<span class="hidden whitespace-nowrap lg:block">
				{formatDate(map.created_at)}
			</span>

			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<Button
						variant="ghost"
						size="icon"
						class="h-7 w-7 shrink-0 text-muted-foreground"
						onclick={(e) => e.preventDefault()}
					>
						<MoreHorizontal class="h-4 w-4" />
					</Button>
				</DropdownMenu.Trigger>
				{@render dropdownMenu()}
			</DropdownMenu.Root>
		</div>
	</a>
{/if}
