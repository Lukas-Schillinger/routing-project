<script lang="ts">
	import { AuthLayout } from '$lib/components/auth';
	import type { LayoutData } from '../$types';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<AuthLayout>
	{@render children?.()}
</AuthLayout>
