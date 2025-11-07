<!-- @component Account page with user profile and organization settings -->
<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { authApi } from '$lib/services/api/auth';
	import { Settings } from 'lucide-svelte';
	import type { PageData } from './$types';
	import MagicInvitesCard from './MagicInvitesCard.svelte';
	import ProfileInformationCard from './ProfileInformationCard.svelte';

	let { data }: { data: PageData } = $props();

	async function handleLogout() {
		await authApi.logout();
		goto('/auth/login');
	}
</script>

<svelte:head>
	<title>Account Settings | Routing Project</title>
	<meta name="description" content="Manage your account settings and organization preferences" />
</svelte:head>

<div class="container mx-auto max-w-4xl p-6">
	<Button onclick={handleLogout} variant="destructive">Logout</Button>
	<div class="mb-6 flex items-center gap-3">
		<Settings class="h-6 w-6" />
		<h1 class="text-3xl font-bold">Account Settings</h1>
	</div>

	<div class="grid gap-6">
		<!-- User Profile Section -->
		<ProfileInformationCard user={data.user} />

		<!-- Security Section -->
		<!-- 		<SecurityCard user={data.user} /> -->

		<Separator />

		<!-- Organization Section -->
		<!-- 		<OrganizationCard organization={data.organization} /> -->

		<!-- Magic Invites Section -->
		<MagicInvitesCard
			magicInvites={data.magicInvites}
			onCreateMagicInvite={() => invalidateAll()}
			onDeleteMagicInvite={() => invalidateAll()}
		/>

		<!-- Preferences Section -->
		<!-- 		<PreferencesCard /> -->
	</div>
</div>
