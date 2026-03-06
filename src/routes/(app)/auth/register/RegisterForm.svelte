<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { registerSchema } from '$lib/schemas/auth';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Lock from '@lucide/svelte/icons/lock';
	import Mail from '@lucide/svelte/icons/mail';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import { untrack } from 'svelte';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';

	let {
		registerForm: registerFormData,
		debugMessage = undefined
	}: {
		registerForm: SuperValidated<Infer<typeof registerSchema>>;
		debugMessage?: string | null;
	} = $props();

	const form = superForm(
		untrack(() => registerFormData),
		{
			validators: zod4Client(registerSchema)
		}
	);
	const { form: formData, enhance, submitting, message } = form;

	const displayMessage = $derived(debugMessage ?? $message);
</script>

{#if displayMessage}
	<Alert.Root variant="destructive">
		<TriangleAlert />
		<Alert.Title>Error</Alert.Title>
		<Alert.Description>{displayMessage}</Alert.Description>
	</Alert.Root>
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
