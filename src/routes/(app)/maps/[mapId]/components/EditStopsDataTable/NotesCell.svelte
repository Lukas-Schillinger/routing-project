<script lang="ts">
	type Props = {
		notes: string | null;
	};

	let { notes }: Props = $props();
</script>

{#if notes}
	<div class="flex items-start text-sm">
		<span class="max-w-[200px] truncate">{notes}</span>
	</div>
{:else}
	<span class="text-sm text-muted-foreground">—</span>
{/if}
