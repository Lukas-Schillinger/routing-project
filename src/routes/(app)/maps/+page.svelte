<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import * as ButtonGroup from '$lib/components/ui/button-group/';
	import { Input } from '$lib/components/ui/input';
	import { SortButton, type SortOption } from '$lib/components/ui/sort-button';
	import * as Tabs from '$lib/components/ui/tabs';
	import { ServiceError } from '$lib/errors';
	import { mapApi } from '$lib/services/api';
	import { pendingImport } from '$lib/stores/pending-import';
	import { parseCsvFile } from '$lib/utils';
	import {
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight,
		CloudUpload,
		Grid3x3,
		List,
		Loader2,
		MapPin,
		Plus,
		Search
	} from 'lucide-svelte';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { MediaQuery, SvelteURLSearchParams } from 'svelte/reactivity';
	import type { PageData } from './$types';
	import DepotsCard from './DepotsCard.svelte';
	import DriversCard from './DriversCard.svelte';
	import MapCard from './MapCard.svelte';

	let { data }: { data: PageData } = $props();

	// New map creation state
	let isCreatingMap = $state(false);
	let fileInputRef = $state<HTMLInputElement | null>(null);

	async function handleCreateNewMap() {
		try {
			isCreatingMap = true;
			const { map } = await mapApi.create({
				title: `Map ${new Date().toLocaleDateString()}`
			});
			await goto(resolve(`/maps/${map.id}`));
		} catch (error) {
			console.error('Failed to create map:', error);
			const message =
				error instanceof ServiceError
					? error.message
					: 'Failed to create map. Please try again.';
			toast.error(message);
		} finally {
			isCreatingMap = false;
		}
	}

	function handleSelectFileClick() {
		fileInputRef?.click();
	}

	async function handleFileSelect(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;

		const result = await parseCsvFile(input.files[0]);

		if (!result.success) {
			toast.error(result.error.message);
			input.value = '';
			return;
		}

		// Store parsed data and navigate to import page
		pendingImport.set({
			fileName: result.data.fileName,
			headers: result.data.headers,
			rows: result.data.rows
		});

		input.value = '';
		await goto(resolve('/maps/import'));
	}

	// Initialize state from URL params (via server) - untrack since we only want initial values
	type SortColumn = 'created_at' | 'title' | 'stops';
	let searchQuery = $state(untrack(() => data.initialState.searchQuery));
	let currentPage = $state(untrack(() => data.initialState.currentPage));
	let viewMode = $state<'list' | 'compact'>(
		untrack(() => data.initialState.viewMode)
	);
	let sortColumn = $state<SortColumn>(
		untrack(() => data.initialState.sortColumn)
	);
	let sortDirection = $state<'asc' | 'desc'>(
		untrack(() => data.initialState.sortDirection)
	);
	const isMobile = new MediaQuery('(max-width: 640px)');

	// TODO: Migrate to runed's useSearchParams for automatic bidirectional URL sync
	function updateUrlParams() {
		const params = new SvelteURLSearchParams();
		if (searchQuery) params.set('q', searchQuery);
		if (viewMode !== 'compact') params.set('view', viewMode);
		if (sortColumn !== 'created_at') params.set('sort', sortColumn);
		if (sortDirection !== 'desc') params.set('dir', sortDirection);
		if (currentPage > 1) params.set('page', currentPage.toString());

		const queryString = params.toString();
		const newUrl = queryString ? `/maps?${queryString}` : '/maps';

		// Use history.replaceState directly to avoid triggering SvelteKit navigation
		history.replaceState(history.state, '', newUrl);
	}

	const sortOptions: SortOption<SortColumn>[] = [
		{ value: 'created_at', label: 'Date' },
		{ value: 'title', label: 'Name' },
		{ value: 'stops', label: 'Stops' }
	];

	function getMapStopCount(mapId: string) {
		return data.mapStats[mapId]?.stop_count ?? 0;
	}

	// Responsive page size
	const pageSize = $derived(
		isMobile.current ? 10 : viewMode === 'compact' ? 12 : 20
	);

	// Filter and sort maps
	const filteredMaps = $derived(() => {
		let maps = searchQuery
			? data.maps.filter((map) =>
					map.title.toLowerCase().includes(searchQuery.toLowerCase())
				)
			: [...data.maps];

		// Sort maps
		maps.sort((a, b) => {
			let comparison = 0;
			switch (sortColumn) {
				case 'created_at':
					comparison =
						new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
					break;
				case 'title':
					comparison = a.title.localeCompare(b.title);
					break;
				case 'stops':
					comparison = getMapStopCount(a.id) - getMapStopCount(b.id);
					break;
			}
			return sortDirection === 'asc' ? comparison : -comparison;
		});

		return maps;
	});

	// Pagination calculations
	const totalPages = $derived(Math.ceil(filteredMaps().length / pageSize));
	const paginatedMaps = $derived(
		filteredMaps().slice((currentPage - 1) * pageSize, currentPage * pageSize)
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

	// Sync state changes to URL
	$effect(() => {
		// Track all state values to trigger URL update
		void [searchQuery, viewMode, sortColumn, sortDirection, currentPage];
		updateUrlParams();
	});

	// Group stop coordinates by map_id for MapCard
	const stopCoordinatesByMap = $derived(() => {
		const grouped: Record<string, typeof data.stopCoordinates> = {};
		for (const coord of data.stopCoordinates) {
			(grouped[coord.map_id] ??= []).push(coord);
		}
		return grouped;
	});

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

<svelte:head>
	<title>Wend | Maps</title>
</svelte:head>

<div class="min-h-screen">
	<!-- Hidden file input for CSV upload -->
	<input
		bind:this={fileInputRef}
		type="file"
		accept=".csv"
		class="hidden"
		onchange={handleFileSelect}
	/>

	<!-- Header Section -->
	<div class="mb-3">
		<div
			class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
		>
			<div>
				<h1 class="text-xl font-semibold tracking-tight">Maps</h1>
			</div>
			<ButtonGroup.Root>
				<Button
					onclick={handleCreateNewMap}
					disabled={isCreatingMap}
					class="gap-2 px-8"
				>
					{#if isCreatingMap}
						<Loader2 class="h-4 w-4 animate-spin" />
						Creating…
					{:else}
						<Plus class="h-4 w-4" />
						New Map
					{/if}
				</Button>
				<Button variant="outline" onclick={handleSelectFileClick}>
					<CloudUpload /> Select File
				</Button>
			</ButtonGroup.Root>
		</div>
	</div>

	<!-- Search and Controls Bar -->
	<div class="mb-6 flex flex-col gap-3">
		<!-- Search -->
		<div class="relative">
			<Search
				class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				type="search"
				placeholder="Search maps…"
				class="h-9 w-full border-border/50 bg-card pl-10 transition-colors focus:border-border sm:max-w-sm"
				bind:value={searchQuery}
			/>
		</div>

		<!-- Controls Row -->
		<div class="flex items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				<!-- View Mode Tabs -->
				<Tabs.Root bind:value={viewMode} class="w-auto">
					<Tabs.List class="h-8 bg-card">
						<Tabs.Trigger value="compact" class="gap-1.5 px-3">
							<Grid3x3 class="h-4 w-4" />
							<span class="hidden sm:inline">Grid</span>
						</Tabs.Trigger>
						<Tabs.Trigger value="list" class="gap-1.5 px-3">
							<List class="h-4 w-4" />
							<span class="hidden sm:inline">List</span>
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>

				<!-- Sort Button -->
				<SortButton
					options={sortOptions}
					bind:value={sortColumn}
					bind:direction={sortDirection}
				/>
			</div>

			<!-- Results count -->
			{#if filteredMaps().length > 0}
				<span class="text-sm text-muted-foreground tabular-nums">
					{(currentPage - 1) * pageSize + 1}-{Math.min(
						currentPage * pageSize,
						filteredMaps().length
					)}
					of {filteredMaps().length}
				</span>
			{/if}
		</div>
	</div>

	<!-- Main Content Grid -->
	<div class="grid gap-8 md:grid-cols-3">
		<!-- Maps Section (2/3 width on large screens) -->
		<div class="md:col-span-2">
			{#if filteredMaps().length === 0}
				<div
					class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-card/50 py-16"
				>
					<div
						class="flex h-12 w-12 items-center justify-center rounded-full bg-muted"
					>
						<MapPin class="h-6 w-6 text-muted-foreground" />
					</div>
					{#if searchQuery}
						<h3 class="mt-4 font-medium">No maps found</h3>
						<p class="mt-1 text-sm text-muted-foreground">
							Try adjusting your search query
						</p>
						<Button
							class="mt-4"
							variant="outline"
							onclick={() => (searchQuery = '')}
						>
							Clear search
						</Button>
					{:else}
						<h3 class="mt-4 font-medium">No maps yet</h3>
						<p class="mt-1 text-sm text-muted-foreground">
							Get started by creating your first map
						</p>
						<Button
							onclick={handleCreateNewMap}
							disabled={isCreatingMap}
							class="mt-4 gap-2"
							variant="outline"
						>
							{#if isCreatingMap}
								<Loader2 class="h-4 w-4 animate-spin" />
								Creating…
							{:else}
								<Plus class="h-4 w-4" />
								Create Map
							{/if}
						</Button>
					{/if}
				</div>
			{:else}
				<!-- Maps Grid/List -->
				<div
					class={viewMode === 'compact'
						? 'grid grid-cols-1 gap-2 sm:grid-cols-2'
						: 'divide-y divide-border/50 rounded-lg border border-border/50'}
				>
					{#each paginatedMaps as map (map.id)}
						<MapCard
							{map}
							stats={data.mapStats[map.id]}
							stopCoordinates={stopCoordinatesByMap()[map.id] ?? []}
							drivers={data.drivers}
							showThumbnail={viewMode === 'list'}
						/>
					{/each}
				</div>

				<!-- Pagination -->
				{#if totalPages > 1}
					<div
						class="mt-6 flex items-center justify-between border-t border-border/50 pt-4"
					>
						<div class="flex items-center gap-1">
							<!-- First page -->
							<Button
								variant="ghost"
								size="icon"
								class="hidden h-8 w-8 sm:flex"
								disabled={currentPage === 1}
								onclick={() => goToPage(1)}
								aria-label="First page"
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
								aria-label="Previous page"
							>
								<ChevronLeft class="h-4 w-4" />
							</Button>
						</div>

						<!-- Page numbers -->
						<div class="flex items-center gap-1">
							{#each getVisiblePageNumbers() as page (page)}
								<Button
									variant={currentPage === page ? 'secondary' : 'ghost'}
									size="icon"
									class="h-8 w-8 text-sm"
									onclick={() => goToPage(page)}
									aria-label="Page {page}"
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
								aria-label="Next page"
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
								aria-label="Last page"
							>
								<ChevronsRight class="h-4 w-4" />
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<!-- Sidebar (1/3 width on large screens) -->
		<div class="min-w-0 space-y-6">
			<!-- Drivers Section -->
			<DriversCard drivers={data.drivers.filter((d) => !d.temporary)} />

			<!-- Depots Section -->
			<DepotsCard depots={data.depots} />
		</div>
	</div>
</div>
