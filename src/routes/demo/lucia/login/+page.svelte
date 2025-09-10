<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { CircleAlert, Lock, Mail, User } from 'lucide-svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Login - Routing Project</title>
</svelte:head>

<div
	class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-sand-50 via-sand-100 to-sand-200 p-6"
>
	<div class="w-full max-w-md">
		<div class="mb-8 text-center">
			<h1 class="headline-medium mb-2">Welcome Back</h1>
			<p class="body-medium text-forest-600">Sign in to your account or create a new one</p>
		</div>

		<Card class="border-sand-300 bg-sand-50 shadow-xl">
			<CardHeader class="space-y-1">
				<CardTitle class="headline-card text-center text-forest-800">
					<User class="mx-auto mb-2 h-8 w-8 text-forest-600" />
					Authentication
				</CardTitle>
				<CardDescription class="body-medium text-center text-forest-600">
					Enter your email and password to continue
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-6">
				{#if form?.message}
					<Alert.Root variant="destructive" class="border-red-200 bg-red-50">
						<CircleAlert class="h-4 w-4 text-red-600" />
						<Alert.Title class="text-red-800">Error</Alert.Title>
						<Alert.Description class="text-red-700">{form.message}</Alert.Description>
					</Alert.Root>
				{/if}

				<form method="post" action="?/login" use:enhance class="space-y-4" novalidate>
					<div class="space-y-2">
						<Label for="email" class="body-medium text-forest-700">Email</Label>
						<div class="relative">
							<Mail class="absolute top-3 left-3 h-4 w-4 text-forest-400" />
							<Input
								id="email"
								type="email"
								name="email"
								placeholder="Enter your email"
								class="border-sand-300 bg-white pl-10 focus:border-forest-500 focus:ring-forest-500"
								required
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="password" class="body-medium text-forest-700">Password</Label>
						<div class="relative">
							<Lock class="absolute top-3 left-3 h-4 w-4 text-forest-400" />
							<Input
								id="password"
								type="password"
								name="password"
								placeholder="Enter your password"
								class="border-sand-300 bg-white pl-10 focus:border-forest-500 focus:ring-forest-500"
								required
							/>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3 pt-2">
						<Button type="submit" class="bg-forest-600 text-white hover:bg-forest-700">
							Sign In
						</Button>
						<Button
							formaction="?/register"
							variant="outline"
							class="border-forest-300 text-forest-700 hover:bg-forest-50 hover:text-forest-800"
						>
							Register
						</Button>
					</div>
				</form>

				<div class="text-center">
					<p class="body-small text-forest-600">
						Don't have an account?
						<button class="body-small font-medium text-forest-700 underline hover:text-forest-800">
							Contact support
						</button>
					</p>
				</div>
			</CardContent>
		</Card>

		<div class="mt-8 text-center">
			<p class="body-small text-forest-500">
				By signing in, you agree to our terms of service and privacy policy.
			</p>
		</div>
	</div>
</div>
