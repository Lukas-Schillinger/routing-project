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
	import EditOrCreateStopPopover from '$lib/components/EditOrCreateStopPopover.svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import * as Card from '$lib/components/ui/card';
	import { createSvelteTable, FlexRender, renderComponent } from '$lib/components/ui/data-table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Empty from '$lib/components/ui/empty';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import type { StopWithLocation } from '$lib/schemas/stop';
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
	import {
		ArrowDown,
		ArrowUp,
		ArrowUpDown,
		Check,
		ChevronDown,
		MapPin,
		Search
	} from 'lucide-svelte';
	import AddressCell from './AddressCell.svelte';
	import DateCell from './DateCell.svelte';
	import NotesCell from './NotesCell.svelte';
	import StopActionsCell from './StopActionsCell.svelte';

	interface Props {
		stops: StopWithLocation[];
		mapId: string;
		onDelete?: (id: string) => Promise<void>;
		onToggleInclude?: (id: string, included: boolean) => Promise<void>;
		onUpdate?: (stop: StopWithLocation) => void;
		onCreate?: (stop: StopWithLocation) => void;
		onZoomToStop: (stopId: string) => void;
	}

	let { stops, mapId, onDelete, onToggleInclude, onUpdate, onCreate, onZoomToStop }: Props =
		$props();

	// Table state
	let sorting = $state<SortingState>([{ id: 'contact', desc: true }]);
	let columnFilters = $state<ColumnFiltersState>([]);
	let columnVisibility = $state<VisibilityState>({});
	let rowSelection = $state({});
	let globalFilter = $state('');
	let searchField = $state<string>('contact');
	let searchValue = $state('');

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

	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });

	// Get current sort state for a column
	const getSortIcon = (columnId: string) => {
		const sortedColumn = sorting.find((s) => s.id === columnId);
		if (!sortedColumn) return null;
		return sortedColumn.desc ? ArrowDown : ArrowUp;
	};

	// Toggle sort for a column
	const toggleSort = (columnId: string) => {
		const existingSort = sorting.find((s) => s.id === columnId);
		if (!existingSort) {
			sorting = [{ id: columnId, desc: false }];
		} else if (!existingSort.desc) {
			sorting = [{ id: columnId, desc: true }];
		} else {
			sorting = [];
		}
	};

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
						id: 'phone',
						desc: true
					}
				]
			}
		})
	);
</script>

{#if stops.length === 0}
	<Card.Root>
		<Card.Content class="p-0">
			<Empty.Root>
				<Empty.Media variant="icon">
					<MapPin />
				</Empty.Media>
				<Empty.Content>
					<Empty.Title>No stops yet</Empty.Title>
					<Empty.Description>Upload a CSV file to add stops to this map.</Empty.Description>
				</Empty.Content>
			</Empty.Root>
		</Card.Content>
	</Card.Root>
{:else}
	<div class="space-y-4">
		<!-- Toolbar -->
		<div class="flex flex-col justify-between gap-2 sm:flex-row">
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
			<!-- Sort dropdown -->
			<div class="flex flex-col gap-2 sm:flex-row">
				<div class="flex gap-2">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger class="{buttonVariants({ variant: 'outline' })} grow gap-2">
							<ArrowUpDown class="h-4 w-4" />
							Sort
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end" class="w-48">
							{#each table.getAllColumns().filter((column) => column.getCanSort()) as column}
								{@const SortIcon = getSortIcon(column.id)}
								{@const currentSort = sorting.find((s) => s.id === column.id)}
								<DropdownMenu.Item onclick={() => toggleSort(column.id)} class="justify-between">
									<span class="flex items-center">
										<span class="mr-2 inline-block h-4 w-4">
											{#if SortIcon}
												<SortIcon class="h-4 w-4" />
											{/if}
										</span>
										{column.columnDef.header}
									</span>
									<span class="ml-auto w-12 text-right text-xs text-muted-foreground">
										{#if currentSort}
											({currentSort.desc ? 'desc' : 'asc'})
										{/if}
									</span>
								</DropdownMenu.Item>
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Root>

					<!-- Column visibility dropdown -->
					<DropdownMenu.Root>
						<DropdownMenu.Trigger class="{buttonVariants({ variant: 'outline' })} grow gap-2">
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
					triggerClass="w-full"
				>
					<Button class="w-full" variant="secondary">
						<MapPin class="mr-2 h-4 w-4" />
						Create Stop
					</Button>
				</EditOrCreateStopPopover>
			</div>
		</div>

		<!-- Data table -->
		<div class="">
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
		<div class="flex flex-col items-center justify-between gap-4 px-2 sm:flex-row">
			<div class="flex-1 text-sm text-muted-foreground">
				{table.getFilteredSelectedRowModel().rows.length} of{' '}
				{table.getFilteredRowModel().rows.length} row(s) selected.
			</div>
			<div class="flex items-center space-x-4 sm:space-x-6 lg:space-x-8">
				<div class="flex items-center space-x-2">
					<p class="hidden text-sm font-medium sm:block">Rows per page</p>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							class="flex h-8 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
						>
							{table.getState().pagination.pageSize}
							<ChevronDown class="h-4 w-4" />
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							{#each [10, 20, 30, 40, 50] as pageSize}
								<DropdownMenu.Item
									onclick={() => {
										table.setPageSize(Number(pageSize));
									}}
								>
									{pageSize}
								</DropdownMenu.Item>
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
				<div class="flex w-[60px] items-center justify-center text-sm font-medium sm:w-[100px]">
					<span class="sm:hidden"
						>{table.getState().pagination.pageIndex + 1}/{table.getPageCount()}</span
					>
					<span class="hidden sm:inline">
						Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
					</span>
				</div>
				<div class="flex items-center space-x-2">
					<Button
						variant="outline"
						size="sm"
						onclick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						class="hidden sm:inline-flex"
					>
						Previous
					</Button>
					<Button
						variant="outline"
						size="icon"
						onclick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						class="h-8 w-8 sm:hidden"
					>
						<ChevronDown class="h-4 w-4 rotate-90" />
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						class="hidden sm:inline-flex"
					>
						Next
					</Button>
					<Button
						variant="outline"
						size="icon"
						onclick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						class="h-8 w-8 sm:hidden"
					>
						<ChevronDown class="h-4 w-4 -rotate-90" />
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
