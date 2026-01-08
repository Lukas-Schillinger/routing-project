<!--
	@AI-NOTE: This table displays Stop data with Location information.
	When the Stop schema ($lib/schemas/stop.ts or $lib/server/db/schema.ts) is updated:
	1. Review column definitions (lines ~100-180) and update/add columns as needed
	2. Searchable fields are automatically determined by columns with filterFn defined
	3. Sortable fields are automatically determined by columns with getCanSort() enabled
	4. Add custom filterFn for complex fields (like address) to make them searchable
	5. Test search, sort, and filter functionality after changes
-->
<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import EditOrCreateStopPopover from '$lib/components/EditOrCreateStopPopover';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import { createSvelteTable, FlexRender, renderComponent } from '$lib/components/ui/data-table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Empty from '$lib/components/ui/empty';
	import { FileUpload } from '$lib/components/ui/file-upload';
	import { Input } from '$lib/components/ui/input';
	import { SortButton, type SortOption } from '$lib/components/ui/sort-button';
	import * as Table from '$lib/components/ui/table';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { pendingImport } from '$lib/stores/pending-import';
	import { parseCsvFile } from '$lib/utils';
	import {
		createColumnHelper,
		getCoreRowModel,
		getFilteredRowModel,
		getPaginationRowModel,
		getSortedRowModel,
		type ColumnDef,
		type ColumnFiltersState,
		type PaginationState,
		type SortingState,
		type VisibilityState
	} from '@tanstack/table-core';
	import { Check, ChevronDown, MapPin, Plus, Search } from 'lucide-svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import AddressCell from './AddressCell.svelte';
	import DateCell from './DateCell.svelte';
	import NotesCell from './NotesCell.svelte';
	import StopActionsCell from './StopActionsCell.svelte';

	interface Props {
		stops: StopWithLocation[];
		mapId: string;
		onDelete?: () => Promise<void>;
		onToggleInclude?: (id: string, included: boolean) => Promise<void>;
		onUpdate?: (stop: StopWithLocation) => void;
		onCreate?: (stop: StopWithLocation) => void;
		onZoomToStop: (stopId: string) => void;
	}

	let { stops, mapId, onDelete, onToggleInclude, onUpdate, onCreate, onZoomToStop }: Props =
		$props();

	// CSV upload state
	let csvError = $state<string | null>(null);
	let mobileFileInput = $state<HTMLInputElement | null>(null);

	async function handleCsvUpload(files: File[]) {
		if (files.length === 0) return;

		csvError = null;

		const result = await parseCsvFile(files[0]);

		if (!result.success) {
			csvError = result.error.message;
			return;
		}

		// Store parsed data and navigate to import page
		pendingImport.set({
			fileName: result.data.fileName,
			headers: result.data.headers,
			rows: result.data.rows
		});

		await goto('/maps/import');
	}

	async function handleMobileFileInput(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		if (input.files) {
			await handleCsvUpload(Array.from(input.files));
		}
	}

	// Dynamic page size based on container height
	const ROW_HEIGHT_PX = 57;
	const HEADER_HEIGHT_PX = 41;
	const MIN_PAGE_SIZE = 5;
	const MAX_PAGE_SIZE = 50;

	const isMobile = new MediaQuery('(max-width: 1024px)');
	let tableContainerRef = $state<HTMLDivElement | null>(null);
	let calculatedPageSize = $state(10);

	// Calculate optimal page size based on container height
	function calculatePageSize(containerHeight: number) {
		if (isMobile.current) {
			return 10;
		}
		const availableHeight = containerHeight - HEADER_HEIGHT_PX;
		const rows = Math.floor(availableHeight / ROW_HEIGHT_PX);
		return Math.max(MIN_PAGE_SIZE, Math.min(MAX_PAGE_SIZE, rows));
	}

	// Watch container size changes
	$effect(() => {
		if (!tableContainerRef) return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const newPageSize = calculatePageSize(entry.contentRect.height);
				if (newPageSize !== calculatedPageSize) {
					calculatedPageSize = newPageSize;
					pagination = { ...pagination, pageSize: newPageSize };
				}
			}
		});

		observer.observe(tableContainerRef);

		return () => observer.disconnect();
	});

	// Sort options for the SortButton
	const sortOptions: SortOption<string>[] = [
		{ value: 'contact', label: 'Contact' },
		{ value: 'updated_at', label: 'Updated' },
		{ value: 'notes', label: 'Notes' }
	];

	// Sort state for SortButton
	let sortColumn = $state<string>('updated_at');
	let sortDirection = $state<'asc' | 'desc'>('desc');

	// Table state
	let sorting = $state<SortingState>([{ id: sortColumn, desc: sortDirection === 'desc' }]);
	let columnFilters = $state<ColumnFiltersState>([]);
	let columnVisibility = $state<VisibilityState>({});
	let rowSelection = $state({});
	let globalFilter = $state('');
	let searchField = $state<string>('contact');
	let searchValue = $state('');

	// Sync SortButton state to TanStack Table sorting
	$effect(() => {
		sorting = [{ id: sortColumn, desc: sortDirection === 'desc' }];
	});

	// Update column filter when search field or value changes
	$effect(() => {
		if (searchValue.trim()) {
			columnFilters = [{ id: searchField, value: searchValue }];
		} else {
			columnFilters = [];
		}
	});

	// Add types for table columns
	const columnHelper = createColumnHelper<StopWithLocation>();

	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: calculatedPageSize });

	// Define columns
	const columns: ColumnDef<StopWithLocation, any>[] = [
		// Actions column
		columnHelper.display({
			id: 'actions',
			header: '',
			cell: ({ row }) => {
				const stop = row.original;
				return renderComponent(StopActionsCell, {
					stop,
					onDelete,
					onUpdate,
					onZoomToStop
				});
			},

			enableSorting: true,
			enableHiding: false
		}),

		// Include checkbox column. Included as example for future projects
		/* columnHelper.display({
			id: 'include',
			header: ({ table }) =>
				renderComponent(Checkbox, {
					checked: table.getIsAllPageRowsSelected(),
					indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
					onCheckedChange: (value: boolean) => {
						table.toggleAllPageRowsSelected(!!value);
					},
					'aria-label': 'Select all'
				}),
			cell: ({ row }) =>
				renderComponent(Checkbox, {
					checked: row.getIsSelected(),
					onCheckedChange: (value: boolean) => {
						row.toggleSelected(!!value);
						onToggleInclude?.(row.original.stop.id, !!value);
					},
					'aria-label': 'Include in route'
				}),
			enableSorting: false,
			enableHiding: false
		}), */

		// Contact name column
		columnHelper.accessor((row) => row.stop.contact_name, {
			id: 'contact',
			header: 'Contact',
			cell: (info) => {
				const value = info.getValue();
				return value || '—';
			},
			filterFn: (row, id, value) => {
				const contactName = row.original.stop.contact_name || '';
				return contactName.toLowerCase().includes(value.toLowerCase());
			}
		}),

		// Address column
		columnHelper.accessor((row) => row.location, {
			id: 'address',
			header: 'Address',
			cell: (info) => {
				const location = info.getValue();
				return renderComponent(AddressCell, { location });
			},
			filterFn: (row, id, value) => {
				const location = row.original.location;
				const searchStr =
					`${location.address_line_1} ${location.city} ${location.region} ${location.postal_code}`.toLowerCase();
				return searchStr.includes(value.toLowerCase());
			},
			enableSorting: false
		}),

		// Phone column
		columnHelper.accessor((row) => row.stop.contact_phone, {
			id: 'phone',
			header: 'Phone',
			cell: (info) => {
				const value = info.getValue();
				return value || '—';
			},
			enableSorting: false,
			filterFn: (row, id, value) => {
				const phone = row.original.stop.contact_phone || '';
				return phone.toLowerCase().includes(value.toLowerCase());
			}
		}),

		// Notes column
		columnHelper.accessor((row) => row.stop.notes, {
			id: 'notes',
			header: 'Notes',
			cell: (info) => {
				const notes = info.getValue();
				return renderComponent(NotesCell, { notes });
			}
		}),

		// Updated at column
		columnHelper.accessor((row) => row.stop.updated_at, {
			id: 'updated_at',
			header: 'Updated',
			cell: (info) => {
				const date = info.getValue();
				return renderComponent(DateCell, { date });
			}
		})
	];

	// Create table
	const table = $derived(
		createSvelteTable({
			data: stops,
			columns,
			getCoreRowModel: getCoreRowModel(),
			getPaginationRowModel: getPaginationRowModel(),
			getSortedRowModel: getSortedRowModel(),
			getFilteredRowModel: getFilteredRowModel(),
			onSortingChange: (updater) => {
				if (typeof updater === 'function') {
					sorting = updater(sorting);
				} else {
					sorting = updater;
				}
			},
			onPaginationChange: (updater) => {
				if (typeof updater === 'function') {
					pagination = updater(pagination);
				} else {
					pagination = updater;
				}
			},
			onColumnFiltersChange: (updater) => {
				if (typeof updater === 'function') {
					columnFilters = updater(columnFilters);
				} else {
					columnFilters = updater;
				}
			},
			onColumnVisibilityChange: (updater) => {
				if (typeof updater === 'function') {
					columnVisibility = updater(columnVisibility);
				} else {
					columnVisibility = updater;
				}
			},
			onRowSelectionChange: (updater) => {
				if (typeof updater === 'function') {
					rowSelection = updater(rowSelection);
				} else {
					rowSelection = updater;
				}
			},
			onGlobalFilterChange: (updater) => {
				if (typeof updater === 'function') {
					globalFilter = updater(globalFilter);
				} else {
					globalFilter = updater;
				}
			},
			state: {
				sorting,
				columnFilters,
				columnVisibility,
				rowSelection,
				globalFilter,
				get pagination() {
					return pagination;
				}
			},

			initialState: {
				sorting: [
					{
						id: 'updated_at',
						desc: true
					}
				]
			}
		})
	);
</script>

{#if stops.length === 0}
	<Empty.Root>
		<Empty.Header>
			<Empty.Media variant="icon">
				<MapPin />
			</Empty.Media>
			<Empty.Title>No stops yet</Empty.Title>
			<Empty.Description>Upload a CSV file or create stops manually.</Empty.Description>
		</Empty.Header>

		<div class="flex w-full flex-row items-center justify-center lg:flex-col lg:gap-6">
			<!-- File Upload: Simple button on mobile, dropzone on desktop -->
			{#if isMobile.current}
				<div class="flex flex-col gap-2">
					<Input
						bind:ref={mobileFileInput}
						type="file"
						accept=".csv"
						class=""
						onchange={handleMobileFileInput}
					/>
				</div>
			{:else}
				<FileUpload
					accept=".csv"
					onFileSelect={handleCsvUpload}
					onError={(error) => (csvError = error)}
					hint="CSV files with address data"
					size="sm"
					class="w-full max-w-md"
				/>
			{/if}

			{#if csvError}
				<p class="text-sm text-destructive">{csvError}</p>
			{/if}

			<div class="flex items-center gap-3 text-sm text-muted-foreground">
				<div class="h-px flex-1 bg-border"></div>
				<span>or</span>
				<div class="h-px flex-1 bg-border"></div>
			</div>

			<EditOrCreateStopPopover mode="create" {mapId} onSuccess={invalidateAll}>
				<Button variant="secondary"><Plus /> Add stop</Button>
			</EditOrCreateStopPopover>
		</div>
	</Empty.Root>
{:else}
	<div class="@container flex h-full flex-col">
		<!-- Toolbar -->
		<div class="flex flex-col justify-between gap-2 pb-4 @lg:flex-row @lg:items-center">
			<!-- Search input with field selector -->
			<ButtonGroup.Root class="w-full flex-1">
				<Input
					placeholder="Search {table
						.getAllColumns()
						.find((col) => col.id === searchField)
						?.columnDef.header?.toString()
						.toLowerCase() || 'field'}..."
					bind:value={searchValue}
					class="flex-1"
					type="search"
				/>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class="{buttonVariants({
							variant: 'outline'
						})} shrink-0 rounded-l-none border-l-0 px-3"
					>
						<Search class="h-4 w-4" />
						<ChevronDown class="ml-1 h-3 w-3" />
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-40">
						{#each table.getAllColumns().filter((column) => column.getCanHide()) as column}
							<DropdownMenu.Item onclick={() => (searchField = column.id)} class="justify-between">
								<span class="flex items-center">
									<span class="mr-2 inline-block h-4 w-4">
										{#if searchField === column.id}
											<Check class="h-4 w-4" />
										{/if}
									</span>
									{column.columnDef.header}
								</span>
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</ButtonGroup.Root>
			<!-- Sort and columns -->
			<div class="flex flex-col gap-2 @sm:flex-row">
				<div class="flex gap-2">
					<SortButton
						options={sortOptions}
						bind:value={sortColumn}
						bind:direction={sortDirection}
						size="sm"
					/>

					<!-- Column visibility dropdown -->
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							class="{buttonVariants({ variant: 'outline', size: 'sm' })} grow gap-2"
						>
							Columns <ChevronDown class="h-4 w-4" />
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							{#each table.getAllColumns().filter((column) => column.getCanHide()) as column}
								<DropdownMenu.CheckboxItem
									checked={column.getIsVisible()}
									onCheckedChange={(value) => column.toggleVisibility(!!value)}
								>
									{typeof column.columnDef.header == 'string' ? column.columnDef.header : null}
								</DropdownMenu.CheckboxItem>
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>

				<!-- Create stop button -->
				<EditOrCreateStopPopover
					mode="create"
					{mapId}
					onSuccess={(stop) => {
						onCreate?.(stop);
					}}
					triggerClass="w-full flex"
				>
					<Button class="w-full" variant="secondary" size="sm">
						<MapPin class="mr-2 h-4 w-4" />
						Create Stop
					</Button>
				</EditOrCreateStopPopover>
			</div>
		</div>

		<!-- Data table -->
		<div bind:this={tableContainerRef} class="min-h-0 flex-1 overflow-auto">
			<Table.Root>
				<Table.Header>
					{#each table.getHeaderGroups() as headerGroup}
						<Table.Row>
							{#each headerGroup.headers as header}
								<Table.Head>
									{#if !header.isPlaceholder}
										<FlexRender
											content={header.column.columnDef.header}
											context={header.getContext()}
										/>
									{/if}
								</Table.Head>
							{/each}
						</Table.Row>
					{/each}
				</Table.Header>
				<Table.Body>
					{#if table.getRowModel().rows?.length}
						{#each table.getRowModel().rows as row}
							<Table.Row data-state={row.getIsSelected() && 'selected'}>
								{#each row.getVisibleCells() as cell}
									<Table.Cell>
										<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
									</Table.Cell>
								{/each}
							</Table.Row>
						{/each}
					{:else}
						<Table.Row>
							<Table.Cell colspan={columns.length} class="h-24 text-center">No results.</Table.Cell>
						</Table.Row>
					{/if}
				</Table.Body>
			</Table.Root>
		</div>

		<!-- Pagination -->
		<div class="flex shrink-0 items-center justify-center px-2">
			<div class="flex items-center space-x-4 @sm:space-x-6">
				<div class="flex items-center justify-center text-xs text-muted-foreground">
					<span class="tabular-nums @sm:hidden"
						>{table.getState().pagination.pageIndex + 1}/{table.getPageCount()}</span
					>
					<span class="hidden tabular-nums @sm:inline">
						Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
					</span>
				</div>
				<div class="flex items-center space-x-2">
					<Button
						variant="outline"
						size="sm"
						onclick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						class="hidden @sm:inline-flex"
					>
						Previous
					</Button>
					<Button
						variant="outline"
						size="icon"
						onclick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						class="size-7 @sm:hidden"
					>
						<ChevronDown class="h-4 w-4 rotate-90" />
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						class="hidden @sm:inline-flex"
					>
						Next
					</Button>
					<Button
						variant="outline"
						size="icon"
						onclick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						class="size-7 @sm:hidden"
					>
						<ChevronDown class="h-4 w-4 -rotate-90" />
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
