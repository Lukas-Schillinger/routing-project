<script lang="ts">
	import { enhance } from '$app/forms';
	import { AuthAlert } from '$lib/components/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ArrowLeft, Loader2, Lock, Mail } from 'lucide-svelte';
	import type { ActionData } from './$types';

	let {
		form,
		onRequestMagicLogin
	}: {
		form: ActionData;
		onRequestMagicLogin: () => void;
	} = $props();

	let isSubmitting = $state(false);
	let isResending = $state(false);
</script>

{#if form?.message}
	<div class="space-y-3 pb-4">
		<AuthAlert message={form?.message} />
		{#if form && 'code' in form && form.code === 'EMAIL_NOT_CONFIRMED' && 'email' in form && form.email}
			<form
				method="post"
				action="?/resendConfirmation"
				use:enhance={() => {
					isResending = true;
					return async ({ update }) => {
						await update();
						isResending = false;
					};
				}}
			>
				<input type="hidden" name="email" value={form.email} />
				<Button type="submit" variant="outline" size="sm" class="w-full" disabled={isResending}>
					{#if isResending}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Sending...
					{:else}
						Resend confirmation email
					{/if}
				</Button>
			</form>
		{/if}
	</div>
{/if}

{#if form?.resendSuccess}
	<div class="pb-4">
		<AuthAlert message="Confirmation email sent! Check your inbox." variant="success" />
	</div>
{/if}

<form
	method="post"
	action="?/login"
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
	<div class="space-y-1.5">
		<Label for="email" class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
			Email
		</Label>
		<div class="relative">
			<Mail class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
			<Input
				id="email"
				type="email"
				name="email"
				placeholder="you@example.com"
				class="h-11 border-border/50 bg-background/50 pl-10 transition-colors focus:border-primary/50 focus:bg-background"
				required
				disabled={isSubmitting}
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
			<Lock class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
			<Input
				id="password"
				type="password"
				name="password"
				placeholder="Enter your password"
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
				Signing in...
			{:else}
				Sign in
			{/if}
		</Button>

		<div class="relative">
			<div class="absolute inset-0 flex items-center">
				<span class="w-full border-t border-border/30"></span>
			</div>
			<div class="relative flex justify-center text-xs">
				<span class="bg-card px-3 text-muted-foreground/60">or</span>
			</div>
		</div>

		<Button
			variant="ghost"
			type="button"
			class="h-10 w-full text-muted-foreground hover:text-foreground"
			onclick={onRequestMagicLogin}
			disabled={isSubmitting}
		>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to email
		</Button>
	</div>
</form>
