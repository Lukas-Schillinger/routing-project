<script lang="ts">
	import { page } from '$app/state';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { PublicUser } from '$lib/schemas';
	import {
		ChevronRight,
		FileSpreadsheet,
		Grid3x3,
		Map,
		Menu,
		Route,
		TestTube,
		User,
		X,
		Zap
	} from 'lucide-svelte';
	import { mode } from 'mode-watcher';
	import { onMount } from 'svelte';

	let {
		pageHeader = {},
		user
	}: {
		pageHeader?: {
			title?: string;
			description?: string;
			breadcrumbs?: Array<{ name: string; href: string }>;
		};
		user?: PublicUser | null;
	} = $props();

	let mobileMenuOpen = $state(false);
	let headerElement: HTMLDivElement;

	const navigation = [{ name: 'Maps', href: '/maps', icon: Map }];

	const demoPages = [
		{ name: 'Demo Home', href: '/demo', icon: TestTube, description: 'Demo overview page' },

		{
			name: 'CSV Upload',
			href: '/demo/csv',
			icon: FileSpreadsheet,
			description: 'Batch geocoding from CSV'
		},
		{
			name: 'Cool Routes',
			href: '/demo/cool-routes',
			icon: Route,
			description: 'Driver route demos'
		},
		{
			name: 'Distance Matrix',
			href: '/demo/matrix',
			icon: Grid3x3,
			description: 'Matrix API examples'
		},
		{ name: 'GSAP Animations', href: '/demo/gsap', icon: Zap, description: 'Animation demos' }
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
	class="bg-opacity-40 fixed top-0 z-50 w-full rounded-b-lg border-b bg-white/55 backdrop-blur-lg dark:bg-black/55"
	bind:this={headerElement}
>
	<header class="">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex h-10 items-center justify-between overflow-clip">
				<!-- Logo/Brand -->
				<div class="flex items-center">
					<a href="/" class="flex items-center space-x-1">
						<div class="mt-2 flex size-12 items-center justify-center rounded-lg">
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
						<span class="text-3xl font-extrabold tracking-tighter">wend</span>
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
						{#if user}
							<Button
								class={page.url.pathname === '/auth/account' ? '' : 'text-muted-foreground'}
								variant="ghost"
								size="sm"
								href={'/auth/account'}
							>
								<User size="4" />

								<span>Account</span>
							</Button>
						{:else}
							<Button
								class={page.url.pathname === '/auth/login' ? '' : 'text-muted-foreground'}
								variant="ghost"
								size="sm"
								href={'/auth/login'}
							>
								<User size="4" />

								<span>Login</span>
							</Button>
						{/if}

						<ThemeToggle variant="inverse" />
					</nav>
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
								<Button
									class={page.url.pathname === item.href ? '' : 'text-muted-foreground'}
									variant="ghost"
									href={item.href}
									onclick={closeMobileMenu}
								>
									<Icon class="h-5 w-5" />
									<span>{item.name}</span>
								</Button>
							</div>
						{/each}
						{#if user}
							<Button
								class={page.url.pathname === '/auth/account' ? '' : 'text-muted-foreground'}
								variant="ghost"
								size="sm"
								href={'/auth/account'}
							>
								<User size="4" />

								<span>Account</span>
							</Button>
						{:else}
							<Button variant="ghost" size="sm" href={'/auth/login'}>
								<User size="4" />

								<span>Login</span>
							</Button>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</header>

	<!-- Page Header Section (when provided) -->
	{#if pageHeader.title}
		<div class="mx-auto max-w-7xl px-4 py-1 sm:px-6 lg:px-8">
			{#if pageHeader.title}
				<h1 class="text-2xl font-bold">{pageHeader.title}</h1>
				{#if pageHeader.description}
					<p class="mt-2 text-lg">{pageHeader.description}</p>
				{/if}
			{/if}
		</div>
	{/if}
</div>
