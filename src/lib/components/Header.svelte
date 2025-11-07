<script lang="ts">
	import { page } from '$app/state';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import {
		ChevronDown,
		ChevronRight,
		FileSpreadsheet,
		Grid3x3,
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
		{ name: 'Maps', href: '/maps', icon: Map },
		{ name: 'Account', href: '/auth/account', icon: User }
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
<div
	class="bg-opacity-40 fixed top-0 z-50 w-full rounded-b-lg border-b backdrop-blur-lg dark:bg-black/55"
	bind:this={headerElement}
>
	<header class="">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex h-10 items-center justify-between">
				<!-- Logo/Brand -->
				<div class="flex items-center">
					<a href="/" class="flex items-center space-x-2">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/10"
						>
							<MapPin class="h-5 w-5" />
						</div>
						<span class="text-lg font-bold">wend</span>
						{#if pageHeader.breadcrumbs && pageHeader.breadcrumbs.length > 0}
							<ChevronRight class="mr-2 h-4 w-4 " />
						{/if}
					</a>
					{#if pageHeader.breadcrumbs && pageHeader.breadcrumbs.length > 0}
						<nav class=" flex opacity-100" aria-label="Breadcrumb">
							<ol class="flex items-center space-x-2 text-sm">
								{#each pageHeader.breadcrumbs as breadcrumb, index}
									<li class="flex items-center">
										{#if index > 0}
											<ChevronRight class="mr-2 h-4 w-4 " />
										{/if}
										<a
											href={breadcrumb.href}
											class=" transition-colors hover:text-primary-foreground"
										>
											{breadcrumb.name}
										</a>
									</li>
								{/each}
							</ol>
						</nav>
					{/if}
				</div>

				<!-- Desktop Navigation & Theme Toggle -->
				<div class="hidden items-center space-x-4 sm:flex">
					<nav class="flex items-center space-x-1">
						{#each navigation as item}
							<Button
								class={page.url.pathname === item.href ? '' : 'text-muted-foreground'}
								variant="ghost"
								size="sm"
								href={item.href}
							>
								{@const Icon = item.icon}

								<Icon class="h-4 w-4" />
								<span>{item.name}</span>
							</Button>
						{/each}

						<!-- Demo Popover -->
						<Popover.Root>
							<Popover.Trigger>
								<Button
									variant="ghost"
									class="flex items-center space-x-2 {page.url.pathname === '/demo'
										? ''
										: 'text-muted-foreground'} "
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
					<Button variant="ghost" size="sm" onclick={toggleMobileMenu} class="h-9 w-9 p-0 ">
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
							<div>
								<Button variant="ghost" href={item.href} onclick={closeMobileMenu}>
									<Icon class="h-5 w-5" />
									<span>{item.name}</span>
								</Button>
							</div>
						{/each}

						<!-- Demo Section -->
						<div class="mt-2 border-t border-primary-foreground/10 pt-2">
							<div class="px-3 py-2 text-xs font-semibold tracking-wider uppercase">Demo Pages</div>
							{#each demoPages as demo}
								{@const Icon = demo.icon}
								<a
									href={demo.href}
									onclick={closeMobileMenu}
									class="flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
										{page.url.pathname === demo.href ? '' : ''}"
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
	{#if pageHeader.title}
		<div class="">
			<div class="mx-auto max-w-7xl px-4 pb-2 sm:px-6 lg:px-8">
				{#if pageHeader.title}
					<h1 class="text-2xl font-bold">{pageHeader.title}</h1>
					{#if pageHeader.description}
						<p class="mt-2 text-lg">{pageHeader.description}</p>
					{/if}
				{/if}
			</div>
		</div>
	{/if}
</div>
