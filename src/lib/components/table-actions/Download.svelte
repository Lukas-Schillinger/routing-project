<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Download as DownloadIcon } from 'lucide-svelte';

	let {
		onclick,
		href,
		label = 'Download'
	}: {
		onclick?: () => void;
		href?: string;
		label?: string;
	} = $props();
</script>

{#if href}
	<a {href} download>
		<DropdownMenu.Item>
			<DownloadIcon />
			{label}
		</DropdownMenu.Item>
	</a>
{:else}
	<DropdownMenu.Item {onclick}>
		<DownloadIcon />
		{label}
	</DropdownMenu.Item>
{/if}
