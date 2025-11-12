<script lang="ts">
	import { getContext } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Set page header in layout context
	const pageHeaderContext = getContext<{ set: (header: any) => void }>('pageHeader');

	if (pageHeaderContext) {
		pageHeaderContext.set({
			title: undefined,
			breadcrumbs: []
		});
	}
</script>

{@render children?.()}
