<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	import type { Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let isReturning = $state(false);

	async function handleReturnToAdmin() {
		isReturning = true;
		try {
			const response = await fetch('/api/admin/impersonate/stop', {
				method: 'POST'
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to return to admin');
			}

			const result = await response.json();
			await invalidateAll();
			goto(result.redirectUrl || '/admin/organizations');
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to return to admin'
			);
		} finally {
			isReturning = false;
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if data.isImpersonating && data.user}
	<div
		class="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950"
	>
		You are viewing as {data.user.email}
		<button
			onclick={handleReturnToAdmin}
			disabled={isReturning}
			class="ml-2 rounded bg-amber-700 px-2 py-0.5 text-amber-50 hover:bg-amber-800 disabled:opacity-50"
		>
			{isReturning ? 'Returning...' : 'Return to Admin'}
		</button>
	</div>
{/if}

<div class="min-h-screen">
	<Header user={data.user} />
	<main class="mx-auto max-w-7xl px-2 pt-9 pb-12 sm:px-6 lg:px-8">
		{@render children?.()}
	</main>
	<Footer />
</div>
