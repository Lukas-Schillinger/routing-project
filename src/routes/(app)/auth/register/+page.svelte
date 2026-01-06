<script lang="ts">
	import { enhance } from '$app/forms';
	import { AuthAlert, AuthCard } from '$lib/components/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Lock, Mail, UserPlus } from 'lucide-svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Create account - Wend</title>
</svelte:head>

<AuthCard title="Create your account" description="Start optimizing your routes today">
	{#snippet children()}
		<div class="space-y-6">
			<AuthAlert message={form?.message} />

			<form method="post" action="?/register" use:enhance class="space-y-5" novalidate>
				<div class="space-y-1.5">
					<Label
						for="email"
						class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
					>
						Email
					</Label>
					<div class="relative">
						<Mail
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
						/>
						<Input
							id="email"
							type="email"
							name="email"
							placeholder="you@example.com"
							class="h-11 border-border/50 bg-background/50 pl-10 transition-colors focus:border-primary/50 focus:bg-background"
							required
						/>
					</div>
				</div>

				<div class="space-y-1.5">
					<Label
						for="password"
						class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
					>
						Password
					</Label>
					<div class="relative">
						<Lock
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
						/>
						<Input
							id="password"
							type="password"
							name="password"
							placeholder="Create a strong password"
							class="h-11 border-border/50 bg-background/50 pl-10 transition-colors focus:border-primary/50 focus:bg-background"
							required
						/>
					</div>
				</div>

				<div class="space-y-1.5">
					<Label
						for="confirm-password"
						class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
					>
						Confirm password
					</Label>
					<div class="relative">
						<Lock
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
						/>
						<Input
							id="confirm-password"
							type="password"
							name="password-confirm"
							placeholder="Confirm your password"
							class="h-11 border-border/50 bg-background/50 pl-10 transition-colors focus:border-primary/50 focus:bg-background"
							required
						/>
					</div>
				</div>

				<div class="pt-2">
					<Button type="submit" class="h-11 w-full font-medium">
						<UserPlus class="mr-2 h-4 w-4" />
						Create account
					</Button>
				</div>
			</form>
		</div>
	{/snippet}

	{#snippet footer()}
		<p class="text-sm text-muted-foreground">
			Already have an account?
			<Button
				variant="link"
				href="/auth/login"
				class="h-auto p-0 pl-1 text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
			>
				Sign in
			</Button>
		</p>
	{/snippet}
</AuthCard>
