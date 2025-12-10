<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { mode } from 'mode-watcher';
</script>

<div class="sticky top-2 z-50 sm:top-4">
	<div class="mx-2 mt-0 rounded-full border bg-background shadow sm:mx-8">
		<div class="flex justify-between px-1 py-1">
			<a href="/" class="flex items-center space-x-1">
				<div class="flex size-8 items-center justify-center rounded-lg">
					{#if mode.current == 'light'}
						<img
							src="https://storage-public.wend-routing.com/cdn-cgi/image/width=100,height=100,fit=cover,format=webp,quality=100/logo/logo_black.png"
							alt=""
						/>
					{:else}
						<img
							class=""
							src="https://pub-7210daee28ba4cac82595c41b998d12f.r2.dev/logo/logo_white.png"
							alt=""
						/>
					{/if}
				</div>
				<span class="pb-0.5 text-xl font-bold tracking-tighter">wend</span>
			</a>
			<div>
				<Button class="rounded-full" href="/auth/login" variant="outline" size="sm">Log in</Button>
			</div>
		</div>
	</div>
	<div class="absolute top-5 -z-30 w-full border-b"></div>
</div>
