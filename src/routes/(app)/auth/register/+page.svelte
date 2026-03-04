<script lang="ts">
	import { resolve } from '$app/paths';
	import { AuthAlert, AuthCard } from '$lib/components/auth';
	import { Button } from '$lib/components/ui/button';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { registerSchema } from '$lib/schemas/auth';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Lock from '@lucide/svelte/icons/lock';
	import Mail from '@lucide/svelte/icons/mail';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';

	let { data } = $props();
	const form = superForm(
		untrack(() => data.form),
		{
			validators: zod4Client(registerSchema)
		}
	);
	const { form: formData, enhance, submitting, message } = form;
</script>

<svelte:head>
	<title>Wend | Create account</title>
</svelte:head>

<AuthCard
	title="Create your account"
	description="Start optimizing your routes today"
>
	<div class="space-y-6">
		{#if $message}
			<AuthAlert message={$message} />
		{/if}

		<form
			method="post"
			action="?/register"
			use:enhance
			class="space-y-5"
			novalidate
		>
			<Form.Field {form} name="email">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label
							class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>
							Email
						</Form.Label>
						<div class="relative">
							<Mail
								class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
							/>
							<Input
								{...props}
								type="email"
								bind:value={$formData.email}
								placeholder="you@example.com"
								class="h-11 border-border/50 bg-background/50 pl-10 transition-colors focus:border-primary/50 focus:bg-background"
							/>
						</div>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Field {form} name="password">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label
							class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>
							Password
						</Form.Label>
						<div class="relative">
							<Lock
								class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
							/>
							<Input
								{...props}
								type="password"
								bind:value={$formData.password}
								placeholder="Create a strong password…"
								class="h-11 border-border/50 bg-background/50 pl-10 transition-colors focus:border-primary/50 focus:bg-background"
							/>
						</div>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<div class="pt-2">
				<Button type="submit" size="lg" class="w-full" disabled={$submitting}>
					{#if $submitting}
						<Loader2 class="h-4 w-4 animate-spin" />
						Creating account...
					{:else}
						<UserPlus class="h-4 w-4" />
						Create account
					{/if}
				</Button>
			</div>
		</form>
	</div>

	{#snippet footer()}
		<p class="text-sm text-muted-foreground">
			Already have an account?
			<Button
				variant="link"
				href={resolve('/auth/login')}
				class="h-auto p-0 pl-1 text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
			>
				Sign in
			</Button>
		</p>
	{/snippet}
</AuthCard>
