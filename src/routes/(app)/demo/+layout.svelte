<script lang="ts">
	import { getContext } from 'svelte';

	let { children } = $props();

	const pageHeaderContext = getContext<{ set: (header: any) => void }>('pageHeader');
	pageHeaderContext.set({
		title: 'Demo',
		description: 'Manage your routing maps and delivery routes'
	});
</script>

{@render children()}
