<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { User } from 'lucide-svelte';
	import type { ActionData } from './$types';
	import LoginWithPassword from './LoginWithPassword.svelte';
	import RequestMagicLogin from './RequestMagicLogin.svelte';

	let { form }: { form: ActionData } = $props();
	let loginMethod = $state<'password' | 'magic'>('password');
</script>

<svelte:head>
	<title>Login - Routing Project</title>
</svelte:head>

<div
	class="flex min-h-[calc(100vh)] items-center justify-center bg-gradient-to-br from-forest-600 via-forest-700 to-forest-900 p-6"
>
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center"></div>

		<Card class="border-border bg-card shadow-xl">
			<CardHeader class="space-y-1">
				<CardTitle class="headline-card text-center text-foreground">
					<User class="mx-auto mb-2 h-8 w-8 " />
				</CardTitle>
				<CardDescription class="body-medium text-center ">
					{#if loginMethod === 'password'}
						Enter your email and password to continue
					{:else}
						We'll send a magic link to your email
					{/if}
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-6">
				{#if loginMethod === 'password'}
					<LoginWithPassword {form} onRequestMagicLogin={() => (loginMethod = 'magic')} />
				{:else}
					<RequestMagicLogin onBack={() => (loginMethod = 'password')} />
				{/if}

				<div class="text-center">
					<p class="body-small text-muted-foreground">
						Don't have an account?
						<Button
							variant="link"
							href="/auth/register"
							class="body-small font-medium text-foreground underline hover:text-accent-foreground"
						>
							Register Here
						</Button>
					</p>
				</div>
			</CardContent>
		</Card>
	</div>
</div>
