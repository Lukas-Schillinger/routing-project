<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ArrowRight, Lock, Mail, TriangleAlert } from 'lucide-svelte';
	import type { ActionData } from './$types';

	let {
		form,
		onRequestMagicLogin
	}: {
		form: ActionData;
		onRequestMagicLogin: () => void;
	} = $props();
</script>

{#if form?.message}
	<Alert.Root variant="destructive" class="text-destructive">
		<TriangleAlert class="h-4 w-4" />
		<Alert.Title class="">Error</Alert.Title>
		<Alert.Description class="">{form.message}</Alert.Description>
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

	<div class="grid grid-cols-1 gap-3 pt-2">
		<Button type="submit">Sign In</Button>
		<Button variant="ghost" type="button" onclick={onRequestMagicLogin}>
			Sign in with email link
			<ArrowRight />
		</Button>
	</div>
</form>
