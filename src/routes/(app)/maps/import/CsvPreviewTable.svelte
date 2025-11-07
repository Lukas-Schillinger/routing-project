<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Eye } from 'lucide-svelte';

	let {
		csvData,
		csvHeaders,
		mapping,
		maxRows = 5
	}: {
		csvData: any[];
		csvHeaders: string[];
		mapping: Record<string, string>;
		maxRows?: number;
	} = $props();

	const previewData = $derived(csvData.slice(0, maxRows));

	// Get mapped columns for display
	const mappedColumns = $derived(
		Object.entries(mapping)
			.filter(([_, header]) => header && header !== '')
			.map(([field, header]) => ({ field, header }))
	);
</script>

<Card>
	<CardHeader>
		<CardTitle class="flex items-center gap-2">
			<Eye class="h-5 w-5" />
			CSV Preview
		</CardTitle>
	</CardHeader>
	<CardContent>
		{#if previewData.length === 0}
			<p class="text-sm text-muted-foreground">No data to preview</p>
		{:else}
			<div class="space-y-4">
				<!-- Column Mapping Summary -->
				{#if mappedColumns.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each mappedColumns as column}
							<Badge variant="secondary">
								{column.field}: {column.header}
							</Badge>
						{/each}
					</div>
				{/if}

				<!-- Preview Table -->
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b">
								{#each csvHeaders as header}
									<th class="p-2 text-left font-medium">
										{header}
										{#if Object.values(mapping).includes(header)}
											<Badge variant="outline" class="ml-1 text-xs">
												{Object.keys(mapping).find((k) => mapping[k] === header)}
											</Badge>
										{/if}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each previewData as row, index}
								<tr class="border-b">
									{#each csvHeaders as header}
										<td class="p-2 text-muted-foreground">
											{(row as any)[header] || ''}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				{#if csvData.length > maxRows}
					<p class="text-xs text-muted-foreground">
						Showing {maxRows} of {csvData.length} rows
					</p>
				{/if}
			</div>
		{/if}
	</CardContent>
</Card>
