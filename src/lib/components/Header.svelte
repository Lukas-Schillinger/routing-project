<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import type { PublicUser } from '$lib/schemas';
	import { Map, User as UserIcon } from 'lucide-svelte';
	import { mode } from 'mode-watcher';

	// Nav items with their active route prefixes
	const NAV_ACTIVE_PREFIXES = {
		maps: '/maps',
		auth: '/auth'
	};

	let {
		user,
		showLines
	}: {
		user?: PublicUser | null;
		showLines?: boolean;
	} = $props();

	let isActive = $derived({
		maps: page.url.pathname.startsWith(NAV_ACTIVE_PREFIXES.maps),
		auth: page.url.pathname.startsWith(NAV_ACTIVE_PREFIXES.auth)
	});
</script>

<div class="sticky top-2 z-50 sm:top-4">
	<div class="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
		<div class="rounded-full border bg-background/55 shadow backdrop-blur-lg">
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
				<div class="flex gap-2">
					{#if user}
						<Button
							class="rounded-full"
							href="/maps"
							variant={isActive.maps ? 'secondary' : 'ghost'}
							size="sm"
						>
							<Map /> Maps
						</Button>
						<Button
							class="rounded-full"
							href="/auth/account"
							variant={isActive.auth ? 'secondary' : 'ghost'}
							size="sm"
						>
							<UserIcon /> Account
						</Button>
					{:else}
						<Button class="rounded-full" href="/auth/login" variant="ghost" size="sm">Log in</Button
						>
						<Button class="rounded-full" href="/auth/account" size="sm">
							<UserIcon /> Create Account
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</div>
	{#if showLines}
		<div class="absolute top-5 -z-30 w-full border-b"></div>
	{/if}
</div>
