<!-- @component Account page with user profile and organization settings -->
<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { ConfirmDeleteDialog } from '$lib/components/ConfirmDeleteDialog';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { usersApi } from '$lib/services/api/auth';
	import { Settings, Trash2 } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';
	import BillingCard from './BillingCard.svelte';
	import InvitationsCard from './InvitationsCard.svelte';
	import OrganizationCard from './OrganizationCard.svelte';
	import ProfileInformationCard from './ProfileInformationCard.svelte';

	let { data }: { data: PageData } = $props();

	const canDeleteAccount = $derived(data.permissions.includes('users:delete'));

	onMount(() => {
		if ($page.url.searchParams.has('upgraded')) {
			toast.success('Upgraded to Pro!');
			const url = new URL($page.url);
			url.searchParams.delete('upgraded');
			history.replaceState({}, '', url.pathname + url.search);
		}
	});

	async function handleDeleteAccount() {
		try {
			await usersApi.deleteMe();
			toast.success('Account deleted');
			goto(resolve('/auth/login'));
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Failed to delete account'
			);
		}
	}
</script>

<svelte:head>
	<title>Wend | Account</title>
	<meta
		name="description"
		content="Manage your account settings and organization preferences"
	/>
</svelte:head>

<div class="flex justify-center">
	<div class="w-3xl">
		<div class="mb-6 flex items-center gap-3">
			<Settings class="h-6 w-6" />
			<h1 class="text-3xl font-bold">Account Settings</h1>
		</div>

		<div class="grid gap-6">
			<!-- User Profile Section -->
			<ProfileInformationCard user={data.user} />

			<!-- Billing Section -->
			{#if data.billing}
				<BillingCard
					plan={data.billing.plan}
					monthlyCredits={data.billing.monthlyCredits}
					periodEndsAt={data.billing.periodEndsAt}
					cancelAtPeriodEnd={data.billing.cancelAtPeriodEnd}
					credits={data.billing.credits}
					transactions={data.billing.transactions}
					canManageBilling={data.permissions.includes('billing:update')}
				/>
			{/if}

			<!-- Organization Section -->
			<OrganizationCard
				organization={data.organization}
				organizationUsers={data.organizationUsers}
				currentUser={data.user}
				permissions={data.permissions}
			/>

			{#if data.invitationsWithMailRecord}
				<!-- Invitations Section -->
				<InvitationsCard
					invitationsWithMailRecord={data.invitationsWithMailRecord}
					onCreateInvitation={() => invalidateAll()}
					onDeleteInvitation={() => invalidateAll()}
				/>
			{/if}

			<!-- Preferences Section -->
			<!-- 		<PreferencesCard /> -->

			<!-- Delete Account Section (admin only) -->
			{#if canDeleteAccount}
				<Separator />
				<div class="flex flex-col gap-2">
					<h2 class="text-lg font-semibold text-destructive">Danger Zone</h2>
					<p class="text-sm text-muted-foreground">
						Once you delete your account, there is no going back. Please be
						certain.
					</p>
					<div class="mt-2">
						<ConfirmDeleteDialog
							title="Delete Account"
							description="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed."
							confirmText="Delete Account"
							onConfirm={handleDeleteAccount}
						>
							{#snippet trigger({ props })}
								<Button {...props} variant="destructive">
									<Trash2 class="mr-2 h-4 w-4" />
									Delete Account
								</Button>
							{/snippet}
						</ConfirmDeleteDialog>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
