<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ServiceError } from '$lib/errors';
	import favicon from '$lib/assets/favicon.svg';
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	import { adminApi } from '$lib/services/api';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let isReturning = $state(false);
	let returnError = $state<string | null>(null);

	async function handleReturnToAdmin() {
		isReturning = true;
		returnError = null;
		try {
			await adminApi.stopImpersonation();
			await invalidateAll();
			goto(resolve('/admin/organizations'));
		} catch (err) {
			returnError =
				err instanceof ServiceError ? err.message : 'Failed to return to admin';
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
		{#if returnError}
			<p role="alert" class="text-amber-950">{returnError}</p>
		{/if}
	</div>
{/if}

<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-ring"
>
	Skip to content
</a>

<div class="min-h-screen">
	<Header user={data.user} />
	<main
		id="main-content"
		class="mx-auto max-w-7xl scroll-mt-16 px-2 pt-9 pb-12 sm:px-6 lg:px-8"
	>
		{@render children?.()}
	</main>
	<Footer />
</div>
