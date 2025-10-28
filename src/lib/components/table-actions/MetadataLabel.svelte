<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { formatDate } from '$lib/utils';

	let {
		item
	}: {
		item?: { created_at?: Date | string; updated_at?: Date | string };
	} = $props();

	const formatTimestamp = (date: Date | string | undefined) => {
		if (!date) return null;
		const dateObj = typeof date === 'string' ? new Date(date) : date;
		return formatDate(dateObj);
	};

	const created = $derived(item?.created_at ? formatTimestamp(item.created_at) : null);
	const updated = $derived(item?.updated_at ? formatTimestamp(item.updated_at) : null);
</script>

{#if created || updated}
	<DropdownMenu.Separator />
	<DropdownMenu.Label class="text-xs font-normal text-muted-foreground">
		{#if created}
			<div class="flex justify-between gap-4">
				<span>Created:</span>
				<span class="font-medium">{created}</span>
			</div>
		{/if}
		{#if updated}
			<div class="flex justify-between gap-4" class:mt-1={created}>
				<span>Updated:</span>
				<span class="font-medium">{updated}</span>
			</div>
		{/if}
	</DropdownMenu.Label>
{/if}
