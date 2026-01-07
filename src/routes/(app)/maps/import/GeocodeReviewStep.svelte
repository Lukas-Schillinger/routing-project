<script lang="ts">
	import AddressAutocomplete from '$lib/components/AddressAutocomplete.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import type { ImportRecord, ImportState } from '$lib/schemas/import';
	import type { LocationCreate } from '$lib/schemas/location';
	import { cn } from '$lib/utils';
	import { Pencil } from 'lucide-svelte';

	let {
		importState = $bindable(),
		onImport,
		onValidCountChange
	}: {
		importState: ImportState;
		onImport: () => Promise<void>;
		onValidCountChange?: (count: number, isImporting: boolean) => void;
	} = $props();

	let isImporting = $state(false);
	let editingId = $state<string | null>(null);
	let editAddressValue = $state('');

	type Confidence = 'exact' | 'high' | 'medium' | 'low' | 'none';

	function getConfidence(record: ImportRecord): Confidence {
		if (!record.location) return 'none';
		const confidence = record.location.geocode_confidence;
		if (confidence === 'exact') return 'exact';
		if (confidence === 'high') return 'high';
		if (confidence === 'medium') return 'medium';
		if (confidence === 'low') return 'low';
		return 'medium'; // Default if not set
	}

	function getStatusColor(confidence: Confidence): string {
		switch (confidence) {
			case 'exact':
			case 'high':
				return 'bg-muted-foreground';
			case 'medium':
			case 'low':
				return 'bg-warning';
			case 'none':
				return 'bg-destructive';
		}
	}

	function getStatusLabel(confidence: Confidence): string {
		switch (confidence) {
			case 'exact':
				return 'Exact match';
			case 'high':
				return 'High confidence';
			case 'medium':
				return 'Medium confidence';
			case 'low':
				return 'Low confidence';
			case 'none':
				return 'Not found';
		}
	}

	function getFormattedAddress(record: ImportRecord): string {
		if (!record.location) return '';
		const loc = record.location;
		const parts = [
			loc.address_line_1,
			loc.address_line_2,
			loc.city,
			loc.region,
			loc.postal_code
		].filter(Boolean);
		return parts.join(', ');
	}

	function startEditing(record: ImportRecord) {
		editingId = record.id;
		editAddressValue = record.raw.address;
	}

	function cancelEditing() {
		editingId = null;
		editAddressValue = '';
	}

	// No re-geocoding needed - AddressAutocomplete already returns LocationCreate!
	function handleAddressSelected(recordId: string, location: LocationCreate) {
		const record = importState.records.find((r) => r.id === recordId);
		if (record) {
			record.location = location;
			record.status = 'edited';
		}
		cancelEditing();
	}

	export async function handleImport() {
		isImporting = true;
		try {
			await onImport();
		} finally {
			isImporting = false;
		}
	}

	const totalCount = $derived(importState.records.length);
	const validCount = $derived(
		importState.records.filter((r) => r.status === 'success' || r.status === 'edited').length
	);

	// Notify parent when validCount or isImporting changes
	$effect(() => {
		onValidCountChange?.(validCount, isImporting);
	});
	const lowConfidenceCount = $derived(
		importState.records.filter((r) => {
			if (r.status === 'failed') return false;
			const conf = getConfidence(r);
			return conf === 'low' || conf === 'medium';
		}).length
	);
	const failedCount = $derived(importState.records.filter((r) => r.status === 'failed').length);

	const sortedRecords = $derived(
		importState.records
			.map((record) => ({ record, id: record.id }))
			.sort((a, b) => {
				const priority: Record<ImportRecord['status'], number> = {
					failed: 0,
					pending: 1,
					edited: 2,
					success: 3
				};
				return priority[a.record.status] - priority[b.record.status];
			})
	);
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h2 class="text-lg font-semibold tracking-tight">Review Addresses</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			{#if importState.isProcessing}
				Geocoding addresses...
			{:else}
				<span class="tabular-nums">{totalCount}</span> addresses
				{#if validCount > 0}
					<span class="mx-1.5 text-muted-foreground/50">·</span>
					<span>{validCount} valid</span>
				{/if}
				{#if lowConfidenceCount > 0}
					<span class="mx-1.5 text-muted-foreground/50">·</span>
					<span class="text-warning-foreground">{lowConfidenceCount} low confidence</span>
				{/if}
				{#if failedCount > 0}
					<span class="mx-1.5 text-muted-foreground/50">·</span>
					<span class="text-destructive">{failedCount} failed</span>
				{/if}
			{/if}
		</p>
	</div>

	<!-- Table -->
	<div class="rounded-lg border bg-card">
		{#if importState.isProcessing}
			<!-- Loading State -->
			<div class="divide-y">
				{#each Array(5) as _}
					<div class="px-4 py-3">
						<div class="flex items-center gap-4">
							<Skeleton class="h-4 w-24" />
							<Skeleton class="h-4 flex-1" />
							<Skeleton class="h-4 w-16" />
							<Skeleton class="h-4 w-20" />
							<Skeleton class="h-2.5 w-2.5 rounded-full" />
						</div>
						<div class="mt-2 flex items-center gap-4 pl-0">
							<Skeleton class="h-3 w-48" />
						</div>
					</div>
				{/each}
			</div>
		{:else if importState.records.length === 0}
			<div class="px-4 py-12 text-center text-sm text-muted-foreground">No addresses to review</div>
		{:else}
			<!-- Desktop Table -->
			<div class="hidden md:block">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b bg-muted/30">
							<th class="w-8 py-2"></th>
							<th class="px-4 py-2.5 text-left font-medium tracking-wider text-muted-foreground"
								>Name</th
							>
							<th class="px-4 py-2.5 text-left font-medium tracking-wider text-muted-foreground"
								>Address</th
							>
							<th class="px-4 py-2.5 text-left font-medium tracking-wider text-muted-foreground"
								>Phone</th
							>
							<th class="px-4 py-2.5 text-left font-medium tracking-wider text-muted-foreground"
								>Notes</th
							>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each sortedRecords as { record, id } (id)}
							{@const confidence = getConfidence(record)}
							{@const isEditing = editingId === record.id}
							<tr class="group transition-colors hover:bg-muted/20">
								<!-- Status -->
								<td class="py-4 pr-1 align-top">
									<div class="flex items-center justify-end">
										<span
											class={cn('h-2.5 w-2.5 rounded-full', getStatusColor(confidence))}
											title={getStatusLabel(confidence)}
										></span>
									</div>
								</td>

								<!-- Name -->
								<td class="max-w-64 overflow-clip px-4 py-3 align-top">
									<div class="font-medium">{record.raw.name || '—'}</div>
								</td>

								<!-- Address -->
								<td class="px-4 py-3 align-top">
									{#if isEditing}
										<div class="max-w-sm">
											<AddressAutocomplete
												bind:value={editAddressValue}
												placeholder="Search for address..."
												onSelect={(location) => handleAddressSelected(record.id, location)}
												onClear={cancelEditing}
											/>
											<button
												type="button"
												class="mt-1.5 text-xs text-muted-foreground hover:text-foreground"
												onclick={cancelEditing}
											>
												Cancel
											</button>
										</div>
									{:else}
										<button
											type="button"
											class="group/addr flex w-full cursor-pointer items-start gap-2 text-left"
											onclick={() => startEditing(record)}
										>
											<div class="min-w-0 flex-1">
												{#if record.location}
													<div class="flex items-center gap-1.5">
														<span>{getFormattedAddress(record)}</span>
														<Pencil
															class="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/addr:opacity-100"
														/>
													</div>
												{:else}
													<span
														class="inline-flex items-center gap-1.5 text-destructive underline decoration-destructive/50 decoration-dashed underline-offset-2"
													>
														Click to fix address
														<Pencil class="h-3 w-3" />
													</span>
												{/if}
												<div
													class="mt-0.5 font-mono text-xs text-muted-foreground/70"
													title={record.raw.address}
												>
													{record.raw.address.length > 40
														? record.raw.address.slice(0, 40) + '...'
														: record.raw.address}
												</div>
											</div>
										</button>
									{/if}
								</td>

								<!-- Phone -->
								<td class="px-4 py-3 align-top whitespace-nowrap">
									{#if record.raw.phone}
										<span class="font-mono text-xs">{record.raw.phone}</span>
									{:else}
										<span class="text-muted-foreground/50">—</span>
									{/if}
								</td>

								<!-- Notes -->
								<td class="max-w-[200px] px-4 py-3 align-top">
									{#if record.raw.notes}
										<span
											class="line-clamp-2 text-xs text-muted-foreground"
											title={record.raw.notes}
										>
											{record.raw.notes}
										</span>
									{:else}
										<span class="text-muted-foreground/50">—</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile Cards -->
			<div class="divide-y md:hidden">
				{#each sortedRecords as { record, id } (id)}
					{@const confidence = getConfidence(record)}
					{@const isEditing = editingId === record.id}
					<div class="p-4">
						<!-- Header row with name and status -->
						<div class="mb-3 flex items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="font-medium">
									{record.raw.name || '—'}
								</div>
							</div>
							<span
								class={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', getStatusColor(confidence))}
								title={getStatusLabel(confidence)}
							></span>
						</div>

						<!-- Address -->
						<div class="mb-3">
							<div class="mb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
								Address
							</div>
							{#if isEditing}
								<div>
									<AddressAutocomplete
										bind:value={editAddressValue}
										placeholder="Search for address..."
										onSelect={(location) => handleAddressSelected(record.id, location)}
										onClear={cancelEditing}
									/>
									<button
										type="button"
										class="mt-1.5 text-xs text-muted-foreground hover:text-foreground"
										onclick={cancelEditing}
									>
										Cancel
									</button>
								</div>
							{:else}
								<button
									type="button"
									class="flex w-full cursor-pointer items-start gap-2 text-left"
									onclick={() => startEditing(record)}
								>
									<div class="min-w-0 flex-1">
										{#if record.location}
											<div class="flex items-center gap-1.5 text-sm">
												<span>{getFormattedAddress(record)}</span>
												<Pencil class="h-3 w-3 shrink-0 text-muted-foreground" />
											</div>
										{:else}
											<span
												class="inline-flex items-center gap-1.5 text-sm text-destructive underline decoration-destructive/50 decoration-dashed underline-offset-2"
											>
												Tap to fix address
												<Pencil class="h-3 w-3" />
											</span>
										{/if}
										<div class="mt-0.5 font-mono text-xs text-muted-foreground/70">
											{record.raw.address}
										</div>
									</div>
								</button>
							{/if}
						</div>

						<!-- Details grid -->
						<div class="grid grid-cols-3 gap-3 text-sm">
							<div>
								<div
									class="mb-0.5 text-xs font-medium tracking-wider text-muted-foreground uppercase"
								>
									Phone
								</div>
								{#if record.raw.phone}
									<span class="font-mono text-xs">{record.raw.phone}</span>
								{:else}
									<span class="text-muted-foreground/50">—</span>
								{/if}
							</div>
							{#if record.raw.notes}
								<div class="col-span-2">
									<div
										class="mb-0.5 text-xs font-medium tracking-wider text-muted-foreground uppercase"
									>
										Notes
									</div>
									<span class="text-xs text-muted-foreground">{record.raw.notes}</span>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

</div>
