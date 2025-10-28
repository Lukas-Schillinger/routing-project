<script lang="ts">
	import { page } from '$app/state';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ChevronRight, House, Map, MapPin, Menu, User, X } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let {
		pageHeader = {}
	}: {
		pageHeader?: {
			title?: string;
			description?: string;
			breadcrumbs?: Array<{ name: string; href: string }>;
		};
	} = $props();

	let mobileMenuOpen = $state(false);
	let headerElement: HTMLDivElement;

	const navigation = [
		{ name: 'Home', href: '/', icon: House },
		{ name: 'Maps', href: '/maps', icon: Map },
		{ name: 'Geocoding', href: '/demo/mapbox', icon: MapPin },
		{ name: 'Auth', href: '/demo/lucia/login', icon: User }
	];

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	// Update CSS variable when header height changes
	function updateHeaderHeight() {
		if (headerElement) {
			const height = headerElement.offsetHeight;
			document.documentElement.style.setProperty('--header-height', `${height}px`);
		}
	}

	onMount(() => {
		updateHeaderHeight();

		// Update on resize
		const resizeObserver = new ResizeObserver(updateHeaderHeight);
		if (headerElement) {
			resizeObserver.observe(headerElement);
		}

		return () => {
			resizeObserver.disconnect();
		};
	});

	// Update when pageHeader changes
	$effect(() => {
		if (pageHeader) {
			// Use setTimeout to allow DOM to update
			setTimeout(updateHeaderHeight, 0);
		}
	});
</script>

<!-- Branded Navigation Header -->
<div class="fixed top-0 z-50 w-full bg-primary" bind:this={headerElement}>
	<header class="">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex h-10 items-center justify-between">
				<!-- Logo/Brand -->
				<div class="flex items-center">
					<a href="/" class="flex items-center space-x-2">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/10"
						>
							<MapPin class="h-5 w-5 text-primary-foreground" />
						</div>
						<span class="text-xl font-bold text-primary-foreground">wend</span>
					</a>
				</div>

				<!-- Desktop Navigation & Theme Toggle -->
				<div class="hidden items-center space-x-4 sm:flex">
					<nav class="flex space-x-1">
						{#each navigation as item}
							{@const Icon = item.icon}
							<a
								href={item.href}
								class="flex items-center space-x-2 rounded-md px-3 py-1 text-sm font-medium text-primary-foreground/90 transition-colors
									{page.url.pathname === item.href
									? 'bg-primary-foreground/10 text-primary-foreground'
									: 'hover:bg-primary-foreground/10 hover:text-primary-foreground'}"
							>
								<Icon class="h-4 w-4" />
								<span>{item.name}</span>
							</a>
						{/each}
					</nav>
					<ThemeToggle variant="inverse" />
				</div>

				<!-- Mobile menu button & Theme Toggle -->
				<div class="flex items-center space-x-2 sm:hidden">
					<ThemeToggle variant="inverse" />
					<Button
						variant="ghost"
						size="sm"
						onclick={toggleMobileMenu}
						class="h-9 w-9 p-0 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
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
					<div class="space-y-1 border-t border-primary-foreground/10 px-2 pt-2 pb-3">
						{#each navigation as item}
							{@const Icon = item.icon}
							<a
								href={item.href}
								onclick={closeMobileMenu}
								class="flex items-center space-x-3 rounded-md px-3 py-2 text-base font-medium text-primary-foreground/90 transition-colors
									{page.url.pathname === item.href
									? 'bg-primary-foreground/10 text-primary-foreground'
									: 'hover:bg-primary-foreground/10 hover:text-primary-foreground'}"
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

	<!-- Page Header Section (when provided) -->
	{#if pageHeader.title || pageHeader.breadcrumbs}
		<div class="mx-auto max-w-7xl bg-transparent px-4 py-2 backdrop-blur-lg sm:px-6 lg:px-8">
			{#if pageHeader.breadcrumbs && pageHeader.breadcrumbs.length > 0}
				<nav class=" flex" aria-label="Breadcrumb">
					<ol class="flex items-center space-x-2 text-sm">
						{#each pageHeader.breadcrumbs as breadcrumb, index}
							<li class="flex items-center">
								{#if index > 0}
									<ChevronRight class="mr-2 h-4 w-4 text-primary-foreground/60" />
								{/if}
								<a
									href={breadcrumb.href}
									class="text-primary-foreground/80 transition-colors hover:text-primary-foreground"
								>
									{breadcrumb.name}
								</a>
							</li>
						{/each}
					</ol>
				</nav>
			{/if}
			{#if pageHeader.title}
				<h1 class="text-3xl font-bold text-primary-foreground">{pageHeader.title}</h1>
				{#if pageHeader.description}
					<p class="mt-2 text-lg text-primary-foreground/80">{pageHeader.description}</p>
				{/if}
			{/if}
		</div>
	{/if}
</div>
