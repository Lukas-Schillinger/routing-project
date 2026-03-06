<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { resetPasswordSchema } from '$lib/schemas';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Lock from '@lucide/svelte/icons/lock';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { untrack } from 'svelte';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';

	let {
		resetForm: resetFormData,
		debugMessage = undefined
	}: {
		resetForm: SuperValidated<Infer<typeof resetPasswordSchema>>;
		debugMessage?: string | null;
	} = $props();

	const form = superForm(
		untrack(() => resetFormData),
		{
			validators: zod4Client(resetPasswordSchema)
		}
	);
	const { form: formData, enhance, submitting, message } = form;

	const displayMessage = $derived(debugMessage ?? $message);
</script>

{#if displayMessage}
	<div class="pb-4">
		<Alert.Root variant="destructive">
			<TriangleAlert />
			<Alert.Title>Error</Alert.Title>
			<Alert.Description>{displayMessage}</Alert.Description>
		</Alert.Root>
	</div>
{/if}

<form method="post" action="?/reset" use:enhance class="space-y-5" novalidate>
	<input type="hidden" name="email" value={$formData.email} />
	<input type="hidden" name="token" value={$formData.token} />

	<Form.Field {form} name="newPassword">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label
					class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
				>
					New password
				</Form.Label>
				<div class="relative">
					<Lock
						class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
					/>
					<Input
						{...props}
						type="password"
						bind:value={$formData.newPassword}
						placeholder="Enter your new password…"
						class="h-11 border-border/50 bg-background/50 pl-10 transition-colors focus:border-primary/50 focus:bg-background"
						disabled={$submitting}
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
				Resetting password...
			{:else}
				Reset password
			{/if}
		</Button>
	</div>
</form>
