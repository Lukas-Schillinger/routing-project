<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { ExternalLink } from 'lucide-svelte';

	let {
		onclick,
		href,
		label = 'Open'
	}: {
		onclick?: () => void;
		href?: string;
		label?: string;
	} = $props();
</script>

{#if href}
	<a {href} target="_blank" rel="noopener noreferrer">
		<DropdownMenu.Item>
			<ExternalLink />
			{label}
		</DropdownMenu.Item>
	</a>
{:else}
	<DropdownMenu.Item {onclick}>
		<ExternalLink />
		{label}
	</DropdownMenu.Item>
{/if}
