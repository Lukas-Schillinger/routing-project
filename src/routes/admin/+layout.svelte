<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Building2, Coins, CreditCard, LayoutDashboard } from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const navItems = [
		{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/admin/organizations', label: 'Organizations', icon: Building2 },
		{ href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
		{ href: '/admin/credits', label: 'Credits', icon: Coins }
	] as const;

	let currentPath = $derived($page.url.pathname);

	function isActive(href: string): boolean {
		if (href === '/admin') {
			return currentPath === '/admin';
		}
		return currentPath.startsWith(href);
	}
</script>

<Sidebar.Provider>
	<Sidebar.Root collapsible="icon">
		<Sidebar.Header>
			<div class="flex h-10 items-center px-2">
				<span
					class="text-lg font-semibold group-data-[collapsible=icon]:hidden"
				>
					Admin Panel
				</span>
			</div>
		</Sidebar.Header>
		<Sidebar.Content>
			<Sidebar.Group>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each navItems as item (item.href)}
							{@const active = isActive(item.href)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton
									isActive={active}
									tooltipContent={item.label}
								>
									{#snippet child({ props })}
										<a href={resolve(item.href)} {...props}>
											<item.icon class="h-4 w-4" />
											<span>{item.label}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		</Sidebar.Content>
		<Sidebar.Footer>
			<div
				class="px-2 py-1 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden"
			>
				{data.user.email}
			</div>
		</Sidebar.Footer>
	</Sidebar.Root>
	<Sidebar.Inset>
		<header class="flex h-14 items-center gap-2 border-b px-6">
			<Sidebar.Trigger />
			<span class="text-sm text-muted-foreground">Admin Panel</span>
		</header>
		<main class="flex-1 p-6">
			{@render children?.()}
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>
