<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';

	let apiResult = $state<string | null>(null);

	function triggerClientError() {
		throw new Error('Test client-side error');
	}

	function triggerUnhandledRejection() {
		Promise.reject(new Error('Test unhandled promise rejection'));
	}

	async function triggerApiError() {
		apiResult = null;
		const response = await fetch('/demo/sentry/api', { method: 'POST' });
		apiResult = `Status: ${response.status}`;
	}
</script>

<div class="container mx-auto max-w-2xl py-8">
	<h1 class="mb-6 text-2xl font-bold">Sentry Error Testing</h1>

	<div class="space-y-4">
		<Card.Root>
			<Card.Header>
				<Card.Title>Client-Side Errors</Card.Title>
			</Card.Header>
			<Card.Content class="flex gap-2">
				<Button variant="destructive" onclick={triggerClientError}>
					Throw Error
				</Button>
				<Button variant="outline" onclick={triggerUnhandledRejection}>
					Unhandled Rejection
				</Button>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Server-Side Errors</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-wrap gap-2">
				<Button variant="destructive" href="/demo/sentry?error=load">
					Error in Load
				</Button>
				<form method="POST" action="?/triggerError" use:enhance>
					<Button variant="destructive" type="submit">Error in Action</Button>
				</form>
				<Button variant="destructive" onclick={triggerApiError}>
					Error in API
				</Button>
				{#if apiResult}
					<span class="self-center text-sm text-muted-foreground"
						>{apiResult}</span
					>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
