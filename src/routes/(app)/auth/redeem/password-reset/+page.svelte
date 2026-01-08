<script lang="ts">
	import { enhance } from '$app/forms';
	import { AuthAlert, AuthCard } from '$lib/components/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Loader2, Lock } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Reset password - Wend</title>
</svelte:head>

<AuthCard title="Set new password" description="Enter your new password">
	{#if form?.message}
		<div class="pb-4">
			<AuthAlert message={form.message} />
		</div>
	{/if}

	<form
		method="post"
		action="?/reset"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
			};
		}}
		class="space-y-5"
		novalidate
	>
		<input type="hidden" name="email" value={data.email} />
		<input type="hidden" name="token" value={data.token} />

		<div class="space-y-1.5">
			<Label
				for="newPassword"
				class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
			>
				New password
			</Label>
			<div class="relative">
				<Lock
					class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
				/>
				<Input
					id="newPassword"
					type="password"
					name="newPassword"
					placeholder="Enter your new password"
					class="h-11 border-border/50 bg-background/50 pl-10 transition-colors focus:border-primary/50 focus:bg-background"
					required
					disabled={isSubmitting}
				/>
			</div>
		</div>

		<div class="space-y-1.5">
			<Label
				for="confirmPassword"
				class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
			>
				Confirm password
			</Label>
			<div class="relative">
				<Lock
					class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
				/>
				<Input
					id="confirmPassword"
					type="password"
					name="confirmPassword"
					placeholder="Confirm your new password"
					class="h-11 border-border/50 bg-background/50 pl-10 transition-colors focus:border-primary/50 focus:bg-background"
					required
					disabled={isSubmitting}
				/>
			</div>
		</div>

		<div class="pt-2">
			<Button
				type="submit"
				class="h-11 w-full font-medium"
				disabled={isSubmitting}
			>
				{#if isSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Resetting password...
				{:else}
					Reset password
				{/if}
			</Button>
		</div>
	</form>

	{#snippet footer()}
		<p class="text-sm text-muted-foreground">
			Remember your password?
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
