<!-- @component Profile Information card for account page -->
<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { INVALIDATION_KEYS } from '$lib/invalidation-keys';
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import type { PublicUser } from '$lib/schemas';
	import { authApi, usersApi } from '$lib/services/api/auth';
	import { formatDate } from '$lib/utils';
	import { MoonIcon, SunIcon } from 'lucide-svelte';
	import { toggleMode } from 'mode-watcher';
	import { toast } from 'svelte-sonner';

	// Props
	let {
		user
	}: {
		user: PublicUser;
	} = $props();

	// Form state
	let nameValue = $derived(user.name ?? '');
	let isSavingName = $state(false);
	let nameTimeout: ReturnType<typeof setTimeout> | null = null;

	// Debounced save for name field
	function handleNameInput() {
		if (nameTimeout) clearTimeout(nameTimeout);
		nameTimeout = setTimeout(() => saveName(), 800);
	}

	async function saveName() {
		const newName = nameValue.trim() || null;
		if (newName === user.name) return;

		isSavingName = true;
		try {
			await usersApi.updateMe({ name: newName });
			await invalidate(INVALIDATION_KEYS.ACCOUNT);
			toast.success('Profile updated');
		} catch (error) {
			console.error('Failed to update profile:', error);
			toast.error('Failed to update profile');
			nameValue = user.name ?? '';
		} finally {
			isSavingName = false;
		}
	}

	// Save on blur (in case user tabs away before debounce)
	function handleNameBlur() {
		if (nameTimeout) {
			clearTimeout(nameTimeout);
			nameTimeout = null;
		}
		saveName();
	}

	async function handleLogout() {
		await authApi.logout();
		goto(resolve('/auth/login'));
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Profile Information</Card.Title>
		<Card.Description>Manage your personal account information</Card.Description
		>
	</Card.Header>
	<Card.Content class="space-y-1">
		<!-- Name (editable) -->
		<div
			class="flex flex-col gap-1 border-b py-4 md:flex-row md:items-center md:justify-between md:gap-4"
		>
			<div class="shrink-0 md:w-48">
				<p class="text-sm font-medium">Name</p>
			</div>
			<Input
				type="text"
				bind:value={nameValue}
				oninput={handleNameInput}
				onblur={handleNameBlur}
				placeholder="Enter your name…"
				disabled={isSavingName}
				class="max-w-xs"
			/>
		</div>

		<!-- Email (read-only) -->
		<div
			class="flex flex-col gap-1 border-b py-4 md:flex-row md:items-center md:justify-between md:gap-4"
		>
			<div class="shrink-0 md:w-48">
				<p class="text-sm font-medium">Email</p>
			</div>
			<p class="text-sm text-muted-foreground">{user.email}</p>
		</div>

		<!-- Member Since (read-only) -->
		<div
			class="flex flex-col gap-1 border-b py-4 md:flex-row md:items-center md:justify-between md:gap-4"
		>
			<div class="shrink-0 md:w-48">
				<p class="text-sm font-medium">Member since</p>
			</div>
			<p class="text-sm text-muted-foreground">{formatDate(user.created_at)}</p>
		</div>

		<!-- Role (read-only) -->
		<div
			class="flex flex-col gap-1 border-b py-4 md:flex-row md:items-center md:justify-between md:gap-4"
		>
			<div class="shrink-0 pb-2 md:w-48 md:pb-0">
				<p class="text-sm font-medium">Role</p>
			</div>
			<Badge class="max-w-fit" variant="secondary">{user.role}</Badge>
		</div>

		<!-- Password reset -->
		<div
			class="flex flex-col gap-1 border-b py-4 md:flex-row md:items-center md:justify-between md:gap-4"
		>
			<div class="shrink-0 pb-2 md:pb-0">
				<p class="text-sm font-medium">Password</p>
				<p class="text-sm text-muted-foreground">
					Reset your password via email
				</p>
			</div>
			<Button
				href={`${resolve('/auth/password-reset')}?email=${encodeURIComponent(user.email)}`}
				variant="outline"
				size="sm"
			>
				Reset password
			</Button>
		</div>

		<!-- Theme toggle -->
		<div
			class="flex flex-col gap-1 py-4 md:flex-row md:items-center md:justify-between md:gap-4"
		>
			<div class="shrink-0 pb-2 md:pb-0">
				<p class="text-sm font-medium">Theme</p>
				<p class="text-sm text-muted-foreground">
					Switch between light and dark mode
				</p>
			</div>
			<Button onclick={toggleMode} variant="outline" size="sm">
				<div class="relative">
					<SunIcon
						class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 !transition-all dark:scale-0 dark:-rotate-90"
					/>
					<MoonIcon
						class="absolute top-0 h-[1.2rem] w-[1.2rem] scale-0 rotate-90 !transition-all dark:scale-100 dark:rotate-0"
					/>
				</div>
				<span>Toggle theme</span>
			</Button>
		</div>
		<Separator />
	</Card.Content>
	<Card.Footer>
		<Button onclick={handleLogout} variant="destructive">Logout</Button>
	</Card.Footer>
</Card.Root>
