<script lang="ts">
	import { mode } from 'mode-watcher';

	interface Props {
		children: any;
	}

	let { children }: Props = $props();
</script>

<div class="relative flex min-h-svh flex-col bg-background">
	<!-- Main content -->
	<div class="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12">
		<!-- Logo -->
		<a href="/" class="mb-10 flex items-center gap-2.5 hover:opacity-80">
			<div class="relative size-36">
				{#if mode.current === 'light'}
					<img
						src="https://storage-public.wend-routing.com/cdn-cgi/image/width=100,height=100,fit=cover,format=webp,quality=100/logo/logo_black.png"
						alt="Wend"
						class="h-full w-full object-contain"
					/>
				{:else}
					<img
						src="https://pub-7210daee28ba4cac82595c41b998d12f.r2.dev/logo/logo_white.png"
						alt="Wend"
						class="h-full w-full object-contain"
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
