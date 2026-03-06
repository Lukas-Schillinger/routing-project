<script lang="ts">
	import { formatDate } from '$lib/utils';

	type Props = {
		date: string | Date;
	};

	let { date }: Props = $props();
</script>

{#if date}
	<div class="flex items-start text-sm">
		<span class="max-w-[200px] truncate">{formatDate(date)}</span>
	</div>
{:else}
	<span class="text-sm text-muted-foreground">—</span>
{/if}
