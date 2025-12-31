<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import type {
		DepotWithLocationJoin,
		Driver,
		Map as MapType,
		Route,
		StopWithLocation
	} from '$lib/schemas';
	import {
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight,
		Grid3x3,
		List,
		MapPin,
		Plus,
		Search
	} from 'lucide-svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import DepotsCardRedesign from './DepotsCardRedesign.svelte';
	import DriversCardRedesign from './DriversCardRedesign.svelte';
	import MapCardRedesign from './MapCardRedesign.svelte';

	let {
		maps,
		stops,
		routes,
		drivers,
		depots
	}: {
		maps: MapType[];
		stops: StopWithLocation[];
		routes: Route[];
		drivers: Driver[];
		depots: DepotWithLocationJoin[];
	} = $props();

	// View and pagination state
	let searchQuery = $state('');
	let currentPage = $state(1);
	let viewMode = $state<'list' | 'compact'>('list');
	const isMobile = new MediaQuery('(max-width: 640px)');

	// Responsive page size
	const pageSize = $derived(isMobile.current ? 5 : viewMode === 'compact' ? 12 : 8);

	// Filter maps
	const filteredMaps = $derived(
		searchQuery
			? maps.filter((map) => map.title.toLowerCase().includes(searchQuery.toLowerCase()))
			: maps
	);

	// Pagination calculations
	const totalPages = $derived(Math.ceil(filteredMaps.length / pageSize));
	const paginatedMaps = $derived(
		filteredMaps.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	// Reset to page 1 when search changes or when current page exceeds total
	$effect(() => {
		if (searchQuery) {
			currentPage = 1;
		}
	});

	$effect(() => {
		if (currentPage > totalPages && totalPages > 0) {
			currentPage = totalPages;
		}
	});

	// Stats
	const activeDrivers = $derived(drivers.filter((d) => d.active && !d.temporary).length);

	function getMapStops(mapId: string) {
		return stops.filter((s) => s.stop.map_id === mapId);
	}

	function getMapRoutes(mapId: string) {
		return routes.filter((r) => r.map_id === mapId);
	}

	function getMapDriverCount(mapId: string) {
		const mapStops = getMapStops(mapId);
		const uniqueDrivers = new Set(
			mapStops.map((s) => s.stop.driver_id).filter((id) => id !== null)
		);
		return uniqueDrivers.size;
	}

	// Pagination helpers
	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
		}
	}

	function getVisiblePageNumbers(): number[] {
		const pages: number[] = [];
		const maxVisible = isMobile.current ? 3 : 5;

		if (totalPages <= maxVisible) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			const half = Math.floor(maxVisible / 2);
			let start = Math.max(1, currentPage - half);
			let end = Math.min(totalPages, start + maxVisible - 1);

			if (end - start < maxVisible - 1) {
				start = Math.max(1, end - maxVisible + 1);
			}

			for (let i = start; i <= end; i++) pages.push(i);
		}

		return pages;
	}
</script>

<div class="min-h-screen">
	<!-- Header Section -->
	<div class="mb-4 sm:mb-6">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 class="text-2xl font-semibold tracking-tight">Maps</h1>
				<p class="mt-1 text-sm text-muted-foreground">
					{maps.length} map{maps.length !== 1 ? 's' : ''} total
				</p>
			</div>
			<Button href="/maps/import" class="gap-2">
				<Plus class="h-4 w-4" />
				New Map
			</Button>
		</div>
	</div>

	<!-- Search and Controls Bar -->
	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="relative flex-1 sm:max-w-sm">
			<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="search"
				placeholder="Search maps..."
				class="h-9 w-full border-border/50 bg-card pl-10 transition-colors focus:border-border"
				bind:value={searchQuery}
			/>
		</div>

		<div class="flex items-center gap-2">
			<!-- View Toggle -->
			<div class="hidden items-center rounded-md border border-border/50 bg-card p-0.5 sm:flex">
				<Button
					variant={viewMode === 'list' ? 'secondary' : 'ghost'}
					size="icon"
					class="h-7 w-7"
					onclick={() => (viewMode = 'list')}
				>
					<List class="h-4 w-4" />
				</Button>
				<Button
					variant={viewMode === 'compact' ? 'secondary' : 'ghost'}
					size="icon"
					class="h-7 w-7"
					onclick={() => (viewMode = 'compact')}
				>
					<Grid3x3 class="h-4 w-4" />
				</Button>
			</div>

			{#if filteredMaps.length > 0}
				<span class="text-sm text-muted-foreground">
					{(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredMaps.length)}
					of {filteredMaps.length}
				</span>
			{/if}
		</div>
	</div>

	<!-- Main Content Grid -->
	<div class="grid gap-8 lg:grid-cols-3">
		<!-- Maps Section (2/3 width on large screens) -->
		<div class="lg:col-span-2">
			{#if filteredMaps.length === 0}
				<div
					class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-card/50 py-16"
				>
					<div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
						<MapPin class="h-6 w-6 text-muted-foreground" />
					</div>
					{#if searchQuery}
						<h3 class="mt-4 font-medium">No maps found</h3>
						<p class="mt-1 text-sm text-muted-foreground">Try adjusting your search query</p>
						<Button class="mt-4" variant="outline" onclick={() => (searchQuery = '')}>
							Clear search
						</Button>
					{:else}
						<h3 class="mt-4 font-medium">No maps yet</h3>
						<p class="mt-1 text-sm text-muted-foreground">Get started by creating your first map</p>
						<Button href="/maps/import" class="mt-4 gap-2" variant="outline">
							<Plus class="h-4 w-4" />
							Create Map
						</Button>
					{/if}
				</div>
			{:else}
				<!-- Maps Grid/List -->
				<div class={viewMode === 'compact' ? 'grid grid-cols-1 gap-2 sm:grid-cols-2' : 'space-y-3'}>
					{#each paginatedMaps as map (map.id)}
						{@const mapStops = getMapStops(map.id)}
						{@const mapRoutes = getMapRoutes(map.id)}
						{@const driverCount = getMapDriverCount(map.id)}
						<MapCardRedesign
							{map}
							stops={mapStops}
							routes={mapRoutes}
							{driverCount}
							showThumbnail={viewMode === 'list'}
						/>
					{/each}
				</div>

				<!-- Pagination -->
				{#if totalPages > 1}
					<div class="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
						<div class="flex items-center gap-1">
							<!-- First page -->
							<Button
								variant="ghost"
								size="icon"
								class="hidden h-8 w-8 sm:flex"
								disabled={currentPage === 1}
								onclick={() => goToPage(1)}
							>
								<ChevronsLeft class="h-4 w-4" />
							</Button>
							<!-- Previous -->
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8"
								disabled={currentPage === 1}
								onclick={() => goToPage(currentPage - 1)}
							>
								<ChevronLeft class="h-4 w-4" />
							</Button>
						</div>

						<!-- Page numbers -->
						<div class="flex items-center gap-1">
							{#each getVisiblePageNumbers() as page}
								<Button
									variant={currentPage === page ? 'secondary' : 'ghost'}
									size="icon"
									class="h-8 w-8 text-sm"
									onclick={() => goToPage(page)}
								>
									{page}
								</Button>
							{/each}
						</div>

						<div class="flex items-center gap-1">
							<!-- Next -->
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8"
								disabled={currentPage === totalPages}
								onclick={() => goToPage(currentPage + 1)}
							>
								<ChevronRight class="h-4 w-4" />
							</Button>
							<!-- Last page -->
							<Button
								variant="ghost"
								size="icon"
								class="hidden h-8 w-8 sm:flex"
								disabled={currentPage === totalPages}
								onclick={() => goToPage(totalPages)}
							>
								<ChevronsRight class="h-4 w-4" />
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<!-- Sidebar (1/3 width on large screens) -->
		<div class="space-y-6">
			<!-- Drivers Section -->
			<DriversCardRedesign drivers={drivers.filter((d) => !d.temporary)} />

			<!-- Depots Section -->
			<DepotsCardRedesign {depots} />
		</div>
	</div>
</div>
