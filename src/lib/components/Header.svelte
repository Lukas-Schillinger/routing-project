<script lang="ts">
	import { page } from '$app/state';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import { FileText, House, MapPin, Menu, User, X } from 'lucide-svelte';

	let mobileMenuOpen = $state(false);

	const navigation = [
		{ name: 'Home', href: '/', icon: House },
		{ name: 'Geocoding', href: '/demo/mapbox', icon: MapPin },
		{ name: 'CSV', href: '/demo/csv', icon: FileText },
		{ name: 'Auth', href: '/demo/lucia/login', icon: User }
	];

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<header class="border-b border-border bg-background shadow-sm">
	<div class="container mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 items-center justify-between">
			<!-- Logo/Brand -->
			<div class="flex items-center">
				<a href="/" class="flex items-center space-x-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
						<MapPin class="h-5 w-5 text-primary-foreground" />
					</div>
					<span class="text-xl font-bold text-foreground">wend</span>
				</a>
			</div>

			<!-- Desktop Navigation & Theme Toggle -->
			<div class="hidden items-center space-x-4 md:flex">
				<nav class="flex space-x-1">
					{#each navigation as item}
						{@const Icon = item.icon}
						<a
							href={item.href}
							class="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors
								{page.url.pathname === item.href
								? 'bg-accent text-accent-foreground'
								: ' hover:bg-accent hover:text-accent-foreground'}"
						>
							<Icon class="h-4 w-4" />
							<span>{item.name}</span>
						</a>
					{/each}
				</nav>
				<ThemeToggle />
			</div>

			<!-- Mobile menu button & Theme Toggle -->
			<div class="flex items-center space-x-2 md:hidden">
				<ThemeToggle />
				<Button variant="ghost" size="sm" onclick={toggleMobileMenu} class="h-9 w-9 p-0">
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
				<div class="space-y-1 border-t border-border px-2 pt-2 pb-3">
					{#each navigation as item}
						{@const Icon = item.icon}
						<a
							href={item.href}
							onclick={closeMobileMenu}
							class="flex items-center space-x-3 rounded-md px-3 py-2 text-base font-medium transition-colors
								{page.url.pathname === item.href
								? 'bg-accent text-accent-foreground'
								: ' hover:bg-accent hover:text-accent-foreground'}"
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
