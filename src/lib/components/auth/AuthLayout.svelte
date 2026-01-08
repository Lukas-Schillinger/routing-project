<script lang="ts">
	import { resolve } from '$app/paths';
	import { mode } from 'mode-watcher';
	import type { Snippet } from 'svelte';
	import CloudflareImage from '../CloudflareImage.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="relative flex min-h-svh flex-col bg-background">
	<!-- Main content -->
	<div
		class="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12"
	>
		<!-- Logo -->
		<a
			href={resolve('/')}
			class="mb-10 flex items-center gap-2.5 hover:opacity-80"
		>
			<div class="relative size-36">
				{#if mode.current === 'light'}
					<CloudflareImage
						size="lg"
						src="https://storage-public.wend-routing.com/logo/logo_black.svg"
						alt="wend logo"
					/>
				{:else}
					<CloudflareImage
						size="lg"
						src="https://storage-public.wend-routing.com/logo/logo_white.svg"
						alt="wend logo"
					/>
				{/if}
			</div>
		</a>

		<!-- Form content -->
		<div class="flex w-full justify-center">
			{@render children?.()}
		</div>
	</div>

	<!-- Footer -->
</div>
