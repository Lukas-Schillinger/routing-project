<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Eye } from 'lucide-svelte';

	let {
		onclick,
		href,
		label = 'View details'
	}: {
		onclick?: () => void;
		href?: string;
		label?: string;
	} = $props();
</script>

{#if href}
	<a {href}>
		<DropdownMenu.Item>
			<Eye />
			{label}
		</DropdownMenu.Item>
	</a>
{:else}
	<DropdownMenu.Item {onclick}>
		<Eye />
		{label}
	</DropdownMenu.Item>
{/if}
