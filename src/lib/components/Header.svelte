<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { House, MapPin, Menu, User, X } from 'lucide-svelte';

	let mobileMenuOpen = $state(false);

	const navigation = [
		{ name: 'Home', href: '/', icon: House },
		{ name: 'Mapbox Demo', href: '/demo/mapbox', icon: MapPin },
		{ name: 'Auth Demo', href: '/demo/lucia/login', icon: User }
	];

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<header class="border-b border-sand-300 bg-sand-50 shadow-sm">
	<div class="container mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 items-center justify-between">
			<!-- Logo/Brand -->
			<div class="flex items-center">
				<a href="/" class="flex items-center space-x-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-600">
						<MapPin class="h-5 w-5 text-white" />
					</div>
					<span class="text-xl font-bold text-forest-900">Routing Project</span>
				</a>
			</div>

			<!-- Desktop Navigation -->
			<nav class="hidden space-x-1 md:flex">
				{#each navigation as item}
					{@const Icon = item.icon}
					<a
						href={item.href}
						class="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors
							{page.url.pathname === item.href
							? 'bg-forest-100 text-forest-800'
							: 'text-forest-600 hover:bg-sand-100 hover:text-forest-800'}"
					>
						<Icon class="h-4 w-4" />
						<span>{item.name}</span>
					</a>
				{/each}
			</nav>

			<!-- Mobile menu button -->
			<div class="md:hidden">
				<Button
					variant="ghost"
					size="sm"
					onclick={toggleMobileMenu}
					class="text-forest-600 hover:bg-sand-100 hover:text-forest-800"
				>
					{#if mobileMenuOpen}
						<X class="h-5 w-5" />
					{:else}
						<Menu class="h-5 w-5" />
					{/if}
				</Button>
			</div>
		</div>

		<!-- Mobile Navigation -->
		{#if mobileMenuOpen}
			<div class="md:hidden">
				<div class="space-y-1 border-t border-sand-200 px-2 pt-2 pb-3">
					{#each navigation as item}
						{@const Icon = item.icon}
						<a
							href={item.href}
							onclick={closeMobileMenu}
							class="flex items-center space-x-3 rounded-md px-3 py-2 text-base font-medium transition-colors
								{page.url.pathname === item.href
								? 'bg-forest-100 text-forest-800'
								: 'text-forest-600 hover:bg-sand-100 hover:text-forest-800'}"
						>
							<Icon class="h-5 w-5" />
							<span>{item.name}</span>
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</header>
