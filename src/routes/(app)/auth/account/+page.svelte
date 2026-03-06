<!-- @component Account page with user profile and organization settings -->
<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { INVALIDATION_KEYS } from '$lib/invalidation-keys';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import DebugToolbar from '$lib/components/DebugToolbar.svelte';
	import { ConfirmDeleteDialog } from '$lib/components/ConfirmDeleteDialog';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import type { SubscriptionStatus } from '$lib/server/db/schema';
	import { usersApi } from '$lib/services/api/auth';
	import Settings from '@lucide/svelte/icons/settings';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';
	import BillingCard from './BillingCard.svelte';
	import InvitationsCard from './InvitationsCard.svelte';
	import OrganizationCard from './OrganizationCard.svelte';
	import ProfileInformationCard from './ProfileInformationCard.svelte';

	let { data }: { data: PageData } = $props();

	const canDeleteAccount = $derived(data.permissions.includes('users:delete'));

	// Debug state overrides for billing
	let debugSubscriptionStatus = $state<SubscriptionStatus | null | undefined>(
		undefined
	);
	let debugCancelAtPeriodEnd = $state<boolean | undefined>(undefined);

	const effectiveSubscriptionStatus = $derived(
		debugSubscriptionStatus !== undefined
			? debugSubscriptionStatus
			: (data.billing?.subscriptionStatus ?? null)
	);
	const effectiveCancelAtPeriodEnd = $derived(
		debugCancelAtPeriodEnd !== undefined
			? debugCancelAtPeriodEnd
			: (data.billing?.cancelAtPeriodEnd ?? false)
	);

	onMount(() => {
		if (page.url.searchParams.has('upgraded')) {
			toast.success('Plan upgraded');
			const url = new URL(page.url);
			url.searchParams.delete('upgraded');
			history.replaceState({}, '', url.pathname + url.search);
		}
	});

	let deleteError = $state<string | null>(null);

	async function handleDeleteAccount() {
		deleteError = null;
		try {
			await usersApi.deleteMe();
			toast.success('Account deleted');
			goto(resolve('/auth/login'));
		} catch (err) {
			deleteError =
				err instanceof Error ? err.message : 'Failed to delete account';
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
	<div class="w-full max-w-3xl">
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
					cancelAtPeriodEnd={effectiveCancelAtPeriodEnd}
					subscriptionStatus={effectiveSubscriptionStatus}
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
					onCreateInvitation={() => invalidate(INVALIDATION_KEYS.ACCOUNT)}
					onDeleteInvitation={() => invalidate(INVALIDATION_KEYS.ACCOUNT)}
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
					{#if deleteError}
						<p role="alert" class="text-sm font-medium text-destructive">
							{deleteError}
						</p>
					{/if}
					<div class="mt-2">
						<ConfirmDeleteDialog
							title="Delete Account"
							description="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed."
							confirmText="Delete Account"
							onConfirm={handleDeleteAccount}
						>
							{#snippet trigger({ props })}
								<Button {...props} variant="destructive">
									<Trash2 class="h-4 w-4" />
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

{#if data.billing}
	<DebugToolbar title="Billing States">
		<div class="flex flex-col gap-3">
			<div class="flex flex-col gap-1.5">
				<span class="text-xs font-medium text-muted-foreground"
					>Subscription Status</span
				>
				<div class="flex flex-wrap gap-1">
					{#each [{ value: null, label: 'None' }, { value: 'active', label: 'Active' }, { value: 'past_due', label: 'Past Due' }, { value: 'canceled', label: 'Canceled' }] as { value, label } (label)}
						{@const isActive = debugSubscriptionStatus === value}
						<Button
							variant={isActive ? 'default' : 'outline'}
							size="sm"
							class="h-7 text-xs"
							onclick={() =>
								(debugSubscriptionStatus = value as SubscriptionStatus | null)}
						>
							{label}
						</Button>
					{/each}
				</div>
			</div>

			<div class="flex flex-col gap-1.5">
				<span class="text-xs font-medium text-muted-foreground"
					>Cancel at Period End</span
				>
				<div class="flex gap-1">
					{#each [{ value: false, label: 'No' }, { value: true, label: 'Yes' }] as { value, label } (label)}
						{@const isActive = debugCancelAtPeriodEnd === value}
						<Button
							variant={isActive ? 'default' : 'outline'}
							size="sm"
							class="h-7 flex-1 text-xs"
							onclick={() => (debugCancelAtPeriodEnd = value)}
						>
							{label}
						</Button>
					{/each}
				</div>
			</div>

			{#if debugSubscriptionStatus !== undefined || debugCancelAtPeriodEnd !== undefined}
				<div class="border-t border-border pt-2">
					<Button
						variant="ghost"
						size="sm"
						class="h-6 w-full text-xs text-muted-foreground"
						onclick={() => {
							debugSubscriptionStatus = undefined;
							debugCancelAtPeriodEnd = undefined;
						}}
					>
						Reset to actual
					</Button>
				</div>
			{/if}

			<div class="border-t border-border pt-2 text-xs text-muted-foreground">
				<div>Actual status: {data.billing.subscriptionStatus ?? 'none'}</div>
				<div>
					Actual cancel: {data.billing.cancelAtPeriodEnd ? 'yes' : 'no'}
				</div>
			</div>
		</div>
	</DebugToolbar>
{/if}
