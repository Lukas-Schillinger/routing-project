<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import {
		Building2,
		Coins,
		CreditCard,
		LayoutDashboard,
		Package
	} from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const navItems = [
		{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/admin/organizations', label: 'Organizations', icon: Building2 },
		{ href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
		{ href: '/admin/plans', label: 'Plans', icon: Package },
		{ href: '/admin/credits', label: 'Credits', icon: Coins }
	];

	let currentPath = $derived($page.url.pathname);

	function isActive(href: string): boolean {
		if (href === '/admin') {
			return currentPath === '/admin';
		}
		return currentPath.startsWith(href);
	}
</script>

<div class="flex min-h-screen">
	<aside class="w-64 border-r bg-muted/40">
		<div class="flex h-14 items-center border-b px-4">
			<h1 class="text-lg font-semibold">Admin Panel</h1>
		</div>
		<nav class="flex flex-col gap-1 p-4">
			{#each navItems as item (item.href)}
				{@const active = isActive(item.href)}
				<Button
					variant={active ? 'secondary' : 'ghost'}
					class="justify-start gap-2"
					href={item.href}
				>
					<item.icon class="h-4 w-4" />
					{item.label}
				</Button>
			{/each}
		</nav>
	</aside>
	<div class="flex flex-1 flex-col">
		<header class="flex h-14 items-center justify-between border-b px-6">
			<span class="text-sm text-muted-foreground">Admin Panel</span>
			<span class="text-sm text-muted-foreground">{data.user.email}</span>
		</header>
		<main class="flex-1 p-6">
			{@render children?.()}
		</main>
	</div>
</div>
