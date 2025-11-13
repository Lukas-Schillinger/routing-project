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

					<div class="grid grid-cols-1 gap-3 px-16 pt-2">
						<Button type="submit">Sign In</Button>
					</div>
				</form>

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

<style lang="postcss">
	:global(body) {
		background-color: #013328;
	}
</style>
