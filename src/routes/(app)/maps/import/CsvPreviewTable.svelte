<script lang="ts">
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import Ban from '@lucide/svelte/icons/ban';
	import Settings from '@lucide/svelte/icons/settings';
	let {
		csvData,
		csvHeaders,
		nameColumn = $bindable(''),
		addressColumn = $bindable(''),
		phoneColumn = $bindable(''),
		notesColumn = $bindable(''),
		maxRows = 5
	}: {
		csvData: Record<string, string>[];
		csvHeaders: string[];
		nameColumn?: string;
		addressColumn?: string;
		phoneColumn?: string;
		notesColumn?: string;
		maxRows?: number;
	} = $props();

	const previewData = $derived(csvData.slice(0, maxRows));

	const fieldOptions = [
		{ key: 'name', label: 'Name', required: false },
		{ key: 'address', label: 'Address', required: true },
		{ key: 'phone', label: 'Phone', required: false },
		{ key: 'notes', label: 'Notes', required: false }
	] as const;

	const columnMap = $derived({
		name: nameColumn,
		address: addressColumn,
		phone: phoneColumn,
		notes: notesColumn
	});

	function getFieldForColumn(header: string): string {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const entry = Object.entries(columnMap).find(([_, col]) => col === header);
		return entry?.[0] || '';
	}

	function clearFieldMapping(field: string) {
		switch (field) {
			case 'name':
				nameColumn = '';
				break;
			case 'address':
				addressColumn = '';
				break;
			case 'phone':
				phoneColumn = '';
				break;
			case 'notes':
				notesColumn = '';
				break;
		}
	}

	function setFieldMapping(field: string, header: string) {
		switch (field) {
			case 'name':
				nameColumn = header;
				break;
			case 'address':
				addressColumn = header;
				break;
			case 'phone':
				phoneColumn = header;
				break;
			case 'notes':
				notesColumn = header;
				break;
		}
	}

	function handleFieldChange(header: string, field: string) {
		if (!field) {
			// Clear mapping for this column
			const currentField = getFieldForColumn(header);
			if (currentField) clearFieldMapping(currentField);
		} else {
			// Clear existing mapping for this field, then set new mapping
			clearFieldMapping(field);
			setFieldMapping(field, header);
		}
	}

	function isFieldMapped(field: string): boolean {
		return !!columnMap[field as keyof typeof columnMap];
	}
</script>

<Card>
	<CardHeader>
		<CardTitle class="flex items-center gap-2">
			<Settings class="h-5 w-5" />
			Column Mapping
		</CardTitle>
		<p class="text-sm text-muted-foreground">
			Select the field type for each column header. Name and Address are
			required.
		</p>
	</CardHeader>
	<CardContent>
		{#if previewData.length === 0}
			<p class="text-sm text-muted-foreground">No data to preview</p>
		{:else}
			<div class="space-y-4">
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b">
								{#each csvHeaders as header (header)}
									<th class="min-w-[200px] space-y-2 p-2 text-left align-top">
										<Select.Root
											type="single"
											value={getFieldForColumn(header)}
											onValueChange={(value) =>
												handleFieldChange(header, value as string)}
										>
											<Select.Trigger class="h-8 w-full">
												<span>
													{#if getFieldForColumn(header)}
														{fieldOptions.find(
															(f) => f.key === getFieldForColumn(header)
														)?.label}
													{:else}
														Select field...
													{/if}
												</span>
											</Select.Trigger>
											<Select.Content>
												<Select.Item value=""
													><span class=""><Ban /> Skip column</span
													></Select.Item
												>
												<Select.Separator />
												{#each fieldOptions as field (field.key)}
													<Select.Item
														value={field.key}
														disabled={isFieldMapped(field.key) &&
															getFieldForColumn(header) !== field.key}
													>
														{field.label}
														{#if field.required}
															<span class="ml-1 text-xs text-destructive"
																>*</span
															>
														{/if}
													</Select.Item>
												{/each}
											</Select.Content>
										</Select.Root>
										<div
											class="font-mono text-sm font-semibold text-muted-foreground"
										>
											{header}
										</div>
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each previewData as row, rowIndex (rowIndex)}
								<tr class="border-b font-mono">
									{#each csvHeaders as header (header)}
										<td class="font p-2 text-muted-foreground">
											<div class="line-clamp-2">{row[header] || ''}</div>
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
