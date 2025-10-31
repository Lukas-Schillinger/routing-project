<script lang="ts">
	import { page } from '$app/state';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import {
		ChevronDown,
		ChevronRight,
		FileSpreadsheet,
		Grid3x3,
		House,
		Map,
		MapPin,
		Menu,
		Mouse,
		Route,
		TestTube,
		TriangleAlert,
		User,
		X,
		Zap
	} from 'lucide-svelte';
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
		{ name: 'Maps', href: '/maps', icon: Map }
	];

	const demoPages = [
		{ name: 'Demo Home', href: '/demo', icon: TestTube, description: 'Demo overview page' },
		{
			name: 'Mapbox',
			href: '/demo/mapbox',
			icon: MapPin,
			description: 'Geocoding and map services'
		},
		{
			name: 'CSV Upload',
			href: '/demo/csv',
			icon: FileSpreadsheet,
			description: 'Batch geocoding from CSV'
		},
		{
			name: 'Address Autocomplete',
			href: '/demo/address-autocomplete',
			icon: Mouse,
			description: 'Real-time address suggestions'
		},
		{
			name: 'Route Visualization',
			href: '/demo/routes',
			icon: Route,
			description: 'Driver route demos'
		},
		{
			name: 'Distance Matrix',
			href: '/demo/matrix',
			icon: Grid3x3,
			description: 'Matrix API examples'
		},
		{ name: 'GSAP Animations', href: '/demo/gsap', icon: Zap, description: 'Animation demos' },
		{
			name: 'Auth (Lucia)',
			href: '/demo/lucia',
			icon: User,
			description: 'Authentication examples'
		},
		{ name: 'Test Map', href: '/demo/test-map', icon: Map, description: 'Fullscreen map testing' }
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
					<nav class="flex items-center space-x-1">
						{#each navigation as item}
							{@const Icon = item.icon}
							<a
								href={item.href}
								class="{buttonVariants({ variant: 'ghost' })}
								text-gray-300
									{page.url.pathname === item.href
									? 'bg-primary-foreground/10 text-primary-foreground'
									: 'hover:bg-primary-foreground/10 hover:text-primary-foreground'}"
							>
								<Icon class="h-4 w-4" />
								<span>{item.name}</span>
							</a>
						{/each}

						<!-- Demo Popover -->
						<Popover.Root>
							<Popover.Trigger>
								<Button
									variant="ghost"
									class="flex items-center space-x-2 text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
								>
									<TriangleAlert class="h-4 w-4" />
									<span>Demo</span>
									<ChevronDown class="h-3 w-3" />
								</Button>
							</Popover.Trigger>
							<Popover.Content class="w-[500px] p-4" align="end">
								<div class="grid gap-3 md:grid-cols-2">
									{#each demoPages as demo}
										{@const Icon = demo.icon}
										<a
											href={demo.href}
											class="group block space-y-1 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
										>
											<div class="flex items-center space-x-2">
												<Icon class="h-4 w-4" />
												<div class="text-sm leading-none font-medium">{demo.name}</div>
											</div>
											<p class="line-clamp-2 text-sm leading-snug text-muted-foreground">
												{demo.description}
											</p>
										</a>
									{/each}
								</div>
							</Popover.Content>
						</Popover.Root>
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
						class="hovet:bg-primary-foreground/10 h-9 w-9 p-0 text-primary-foreground hover:text-primary-foreground"
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

						<!-- Demo Section -->
						<div class="mt-2 border-t border-primary-foreground/10 pt-2">
							<div
								class="px-3 py-2 text-xs font-semibold tracking-wider text-primary-foreground/60 uppercase"
							>
								Demo Pages
							</div>
							{#each demoPages as demo}
								{@const Icon = demo.icon}
								<a
									href={demo.href}
									onclick={closeMobileMenu}
									class="flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium text-primary-foreground/90 transition-colors
										{page.url.pathname === demo.href
										? 'bg-primary-foreground/10 text-primary-foreground'
										: 'hover:bg-primary-foreground/10 hover:text-primary-foreground'}"
								>
									<Icon class="h-4 w-4" />
									<span>{demo.name}</span>
								</a>
							{/each}
						</div>
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
