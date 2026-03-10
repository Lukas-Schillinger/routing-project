<script lang="ts">
	import { dev } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import type { PublicUser } from '$lib/schemas';
	import DatabaseZap from '@lucide/svelte/icons/database-zap';
	import Map from '@lucide/svelte/icons/map';
	import UserIcon from '@lucide/svelte/icons/user';
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

	let provisioning = $state(false);

	async function provision() {
		provisioning = true;
		try {
			const response = await fetch(resolve('/api/dev/provision'), {
				method: 'POST'
			});
			const data = await response.json();
			await goto(resolve(data.redirectUrl));
		} finally {
			provisioning = false;
		}
	}

	let isActive = $derived({
		maps: page.url.pathname.startsWith(NAV_ACTIVE_PREFIXES.maps),
		auth: page.url.pathname.startsWith(NAV_ACTIVE_PREFIXES.auth)
	});
</script>

<div class="sticky top-2 z-50 sm:top-4">
	<div class="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
		<div class="rounded-full border bg-background/55 shadow backdrop-blur-lg">
			<div class="flex justify-between px-1 py-1">
				<a href={resolve('/')} class="flex items-center space-x-1">
					<div class="flex size-8 items-center justify-center rounded-lg">
						{#if mode.current == 'light'}
							<img
								src="https://storage-public.wend-routing.com/cdn-cgi/image/width=100,height=100,fit=cover,format=webp,quality=100/logo/logo_black.png"
								alt="Wend logo"
							/>
						{:else}
							<img
								class=""
								src="https://pub-7210daee28ba4cac82595c41b998d12f.r2.dev/logo/logo_white.png"
								alt="Wend logo"
							/>
						{/if}
					</div>
					<span class="pb-0.5 text-xl font-bold tracking-tighter">wend</span>
				</a>
				<div class="flex gap-2">
					{#if dev}
						<Button
							class="rounded-full border-dashed border-orange-500/50 text-orange-500 hover:border-orange-500 hover:bg-orange-500/10"
							variant="outline"
							size="sm"
							onclick={provision}
							disabled={provisioning}
						>
							<DatabaseZap />
							<span class="hidden sm:inline"
								>{provisioning ? 'Seeding...' : 'Seed Dev Account'}</span
							>
						</Button>
					{/if}
					{#if user}
						<Button
							class="rounded-full"
							href={resolve('/maps')}
							variant={isActive.maps ? 'secondary' : 'ghost'}
							size="sm"
						>
							<Map /> <span class="hidden sm:inline">Maps</span>
						</Button>
						<Button
							class="rounded-full"
							href={resolve('/auth/account')}
							variant={isActive.auth ? 'secondary' : 'ghost'}
							size="sm"
						>
							<UserIcon /> <span class="hidden sm:inline">Account</span>
						</Button>
					{:else}
						<Button
							class="rounded-full"
							href={resolve('/auth/login')}
							variant="ghost"
							size="sm">Log in</Button
						>
						<Button
							class="rounded-full"
							href={resolve('/auth/account')}
							size="sm"
						>
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
