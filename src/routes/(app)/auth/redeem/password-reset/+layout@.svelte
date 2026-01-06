<script lang="ts">
	import { AuthLayout } from '$lib/components/auth';

	let { children }: { children: any } = $props();
</script>

<AuthLayout>
	{@render children?.()}
</AuthLayout>
