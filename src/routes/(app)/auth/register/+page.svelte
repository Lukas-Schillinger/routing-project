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
	import { Lock, Mail, TriangleAlert, User } from 'lucide-svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Wend / Register</title>
</svelte:head>

<div
	class="flex min-h-[calc(100vh)] items-center justify-center bg-gradient-to-br from-forest-600 via-forest-700 to-forest-900 p-6"
>
	<div class="w-full max-w-sm">
		<Card class="border-border bg-card shadow-xl">
			<CardHeader class="space-y-1">
				<CardTitle class="headline-card text-center text-foreground">
					<User class="mx-auto mb-2 h-8 w-8 " />
				</CardTitle>
				<CardDescription class="body-medium text-center ">
					Enter an email and password to register.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-6">
				{#if form?.message}
					<Alert.Root variant="destructive" class="text-destructive">
						<TriangleAlert class="h-4 w-4" />
						<Alert.Title class="">Error</Alert.Title>
						<Alert.Description class="">{form.message}</Alert.Description>
					</Alert.Root>
				{/if}

				<form method="post" action="?/register" use:enhance class="space-y-4" novalidate>
					<div class="space-y-2">
						<Label for="email" class="body-medium text-foreground">Email</Label>
						<div class="relative">
							<Mail class="absolute top-2.5 left-3 h-4 w-4 " />
							<Input
								id="email"
								type="email"
								name="email"
								placeholder="Email"
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
								placeholder="Password"
								class="pl-10"
								required
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="confirm-password" class="body-medium text-foreground"
							>Confirm Password</Label
						>
						<div class="relative">
							<Lock class="absolute top-2.5 left-3 h-4 w-4 " />
							<Input
								id="password"
								type="password"
								name="password-confirm"
								placeholder="Confirm Password"
								class="pl-10"
								required
							/>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-3 pt-2">
						<Button type="submit">Register</Button>
					</div>
				</form>

				<div class="text-center">
					<p class="body-small text-muted-foreground">
						Already have an account?
						<Button
							variant="link"
							href="/auth/login"
							class="body-small font-medium text-foreground underline hover:text-accent-foreground"
						>
							Sign In Here
						</Button>
					</p>
				</div>
			</CardContent>
		</Card>
	</div>
</div>
