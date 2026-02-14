<script lang="ts">
	import { resolve } from '$app/paths';
	import { env } from '$env/dynamic/public';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Spinner } from '$lib/components/ui/spinner';
	import { loadStripe, type StripeElements } from '@stripe/stripe-js';
	import { ArrowLeft, Check } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { Elements, PaymentElement } from 'svelte-stripe';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let stripe = $state<Awaited<ReturnType<typeof loadStripe>>>(null);
	let elements = $state<StripeElements | undefined>(undefined);
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	onMount(async () => {
		stripe = await loadStripe(env.PUBLIC_STRIPE_KEY);
	});

	const proFeatures = [
		'2,000 monthly credits included',
		'Priority route optimization',
		'Advanced analytics & reporting',
		'Email support'
	];

	async function handleSubmit() {
		if (!stripe || !elements) return;

		error = null;
		isSubmitting = true;

		try {
			const result = await stripe.confirmSetup({
				elements,
				confirmParams: {
					return_url: `${window.location.origin}${resolve('/auth/account/upgrade')}`
				}
			});

			if (result.error) {
				error = result.error.message ?? 'Payment setup failed';
				isSubmitting = false;
			}
			// If no error, Stripe redirects — no need to handle success here
		} catch (e) {
			error = e instanceof Error ? e.message : 'An unexpected error occurred';
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Wend | Upgrade to Pro</title>
</svelte:head>

<div class="flex justify-center px-4 py-8">
	<div class="w-full max-w-lg space-y-6">
		<div>
			<a
				href={resolve('/auth/account')}
				class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft class="size-4" />
				Back to Account
			</a>
		</div>

		<Card.Root>
			<Card.Header class="text-center">
				<Card.Title class="text-2xl">Upgrade to Pro</Card.Title>
				<Card.Description>
					Unlock more credits and premium features for your team.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-6">
				<div class="rounded-lg bg-muted/50 p-4">
					<div class="flex items-baseline gap-1">
						<span class="text-3xl font-bold">$49</span>
						<span class="text-muted-foreground">/ month</span>
					</div>
					<ul class="mt-4 space-y-2">
						{#each proFeatures as feature (feature)}
							<li class="flex items-center gap-2 text-sm text-muted-foreground">
								<Check class="size-4 text-green-600" />
								{feature}
							</li>
						{/each}
					</ul>
				</div>

				{#if stripe}
					<Elements {stripe} clientSecret={data.clientSecret} bind:elements>
						<PaymentElement />
					</Elements>
				{:else}
					<div class="flex items-center justify-center py-8">
						<Spinner />
					</div>
				{/if}

				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
			</Card.Content>
			<Card.Footer>
				<Button
					class="w-full"
					onclick={handleSubmit}
					disabled={isSubmitting || !stripe}
				>
					{#if isSubmitting}
						<Spinner class="mr-2" />
						Processing...
					{:else}
						Upgrade to Pro — $49/month
					{/if}
				</Button>
			</Card.Footer>
		</Card.Root>
	</div>
</div>
