<script lang="ts">
	import { page } from '$app/stores';
	import { AuthCard } from '$lib/components/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Loader2, Mail, CheckCircle } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let email = $state($page.url.searchParams.get('email') ?? '');
	let isSubmitting = $state(false);
	let isSuccess = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!email) {
			toast.error('Please enter your email address');
			return;
		}

		isSubmitting = true;

		try {
			const response = await fetch('/api/auth/password-reset', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Failed to send reset link');
			}

			isSuccess = true;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to send reset link');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Reset password - Wend</title>
</svelte:head>

<AuthCard title="Reset password" description="Enter your email to receive a reset link">
	{#if isSuccess}
		<div class="flex flex-col items-center gap-4 py-4 text-center">
			<div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
				<CheckCircle class="h-6 w-6 text-primary" />
			</div>
			<div class="space-y-2">
				<p class="font-medium text-foreground">Check your email</p>
				<p class="text-sm text-muted-foreground">
					We've sent a password reset link to <span class="font-medium">{email}</span>
				</p>
			</div>
			<Button
				variant="ghost"
				href="/auth/login"
				class="mt-2 h-10 text-muted-foreground hover:text-foreground"
			>
				Back to login
			</Button>
		</div>
	{:else}
		<form onsubmit={handleSubmit} class="space-y-5">
			<div class="space-y-1.5">
				<Label
					for="email"
					class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
				>
					Email address
				</Label>
				<div class="relative">
					<Mail class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
					<Input
						id="email"
						type="email"
						bind:value={email}
						placeholder="you@example.com"
						class="h-11 border-border/50 bg-background/50 pl-10 transition-colors focus:border-primary/50 focus:bg-background"
						required
						disabled={isSubmitting}
					/>
				</div>
			</div>

			<div class="flex flex-col gap-3 pt-2">
				<Button type="submit" class="h-11 w-full font-medium" disabled={isSubmitting}>
					{#if isSubmitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Sending...
					{:else}
						Send reset link
					{/if}
				</Button>

				<Button
					variant="ghost"
					href="/auth/login"
					class="h-10 w-full text-muted-foreground hover:text-foreground"
					disabled={isSubmitting}
				>
					Back to login
				</Button>
			</div>
		</form>
	{/if}
</AuthCard>
