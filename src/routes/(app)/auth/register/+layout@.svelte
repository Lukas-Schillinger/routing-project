<script lang="ts">
	import { AuthLayout } from '$lib/components/auth';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<AuthLayout>
	{@render children?.()}
</AuthLayout>
