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
	class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-background via-muted to-secondary p-6"
>
	<div class="w-full max-w-md">
		<div class="mb-8 text-center">
			<h1 class="headline-medium mb-2">Welcome Back</h1>
			<p class="body-medium">Sign in to your account or create a new one</p>
		</div>

		<Card class="border-border bg-card shadow-xl">
			<CardHeader class="space-y-1">
				<CardTitle class="headline-card text-center text-foreground">
					<User class="mx-auto mb-2 h-8 w-8 " />
					Authentication
				</CardTitle>
				<CardDescription class="body-medium text-center ">
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
						<Label for="email" class="body-medium text-foreground">Email</Label>
						<div class="relative">
							<Mail class="absolute top-2.5 left-3 h-4 w-4 " />
							<Input
								id="email"
								type="email"
								name="email"
								placeholder="Enter your email"
								class="pl-10"
								required
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="password" class="body-medium text-foreground">Password</Label>
						<div class="relative">
							<Lock class="absolute top-2.5 left-3 h-4 w-4 " />
							<Input
								id="password"
								type="password"
								name="password"
								placeholder="Enter your password"
								class="pl-10"
								required
							/>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3 pt-2">
						<Button type="submit">Sign In</Button>
						<Button type="submit" formaction="?/register" variant="outline">Register</Button>
					</div>
				</form>

				<div class="text-center">
					<p class="body-small text-muted-foreground">
						Don't have an account?
						<button
							class="body-small font-medium text-foreground underline hover:text-accent-foreground"
						>
							Contact support
						</button>
					</p>
				</div>
			</CardContent>
		</Card>

		<div class="mt-8 text-center">
			<p class="body-small text-muted-foreground">
				By signing in, you agree to our terms of service and privacy policy.
			</p>
		</div>
	</div>
</div>
