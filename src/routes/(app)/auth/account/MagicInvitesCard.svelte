<!-- @component Magic Invites management card for account page -->
<script lang="ts">
	import { ConfirmDeleteDialog } from '$lib/components/ConfirmDeleteDialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import type { MagicInvite, MailRecord } from '$lib/schemas';
	import { ApiError } from '$lib/services/api';
	import { magicLinksApi } from '$lib/services/api/auth';
	import { formatDate } from '$lib/utils';
	import { Trash2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import CreateMagicInvitePopover from './CreateMagicInvitePopover/CreateMagicInvitePopover.svelte';

	// Props
	let {
		magicInvitesWithMailRecord,
		onCreateMagicInvite = () => {},
		onDeleteMagicInvite = () => {}
	}: {
		magicInvitesWithMailRecord: { magicInvite: MagicInvite; mailRecord: MailRecord }[];
		onCreateMagicInvite: (magicInvite: MagicInvite) => void;
		onDeleteMagicInvite: () => void;
	} = $props();

	async function handleDeleteMagicLink(magicLinkId: string) {
		try {
			await magicLinksApi.deleteInvite(magicLinkId);
			onDeleteMagicInvite();
			toast.success('Invitation revoked');
		} catch (err) {
			if (err instanceof ApiError) {
				toast.error(err.message);
			} else {
				toast.error('Failed to revoke invitation');
			}
		}
	}

	function getInviteStatus(magicInvite: MagicInvite) {
		if (magicInvite.used_at) return 'accepted';
		if (magicInvite.expires_at < new Date()) return 'expired';
		return 'pending';
	}

	function getStatusBadgeVariant(status: string) {
		switch (status) {
			case 'accepted':
				return 'default';
			case 'expired':
				return 'destructive';
			case 'pending':
				return 'secondary';
			default:
				return 'outline';
		}
	}

	// Sort invites: pending first, then expired, then accepted
	const sortedInvites = $derived(
		[...magicInvitesWithMailRecord].sort((a, b) => {
			const aStatus = getInviteStatus(a.magicInvite);
			const bStatus = getInviteStatus(b.magicInvite);

			const order = { pending: 0, expired: 1, accepted: 2 };
			if (order[aStatus] !== order[bStatus]) {
				return order[aStatus] - order[bStatus];
			}

			// Within same status, newest first
			return (
				new Date(b.magicInvite.created_at).getTime() - new Date(a.magicInvite.created_at).getTime()
			);
		})
	);

	const pendingCount = $derived(
		magicInvitesWithMailRecord.filter((invite) => getInviteStatus(invite.magicInvite) === 'pending')
			.length
	);
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-start justify-between gap-4">
			<div>
				<Card.Title>Team Invitations</Card.Title>
				<Card.Description>Invite new members to your organization</Card.Description>
			</div>
			<CreateMagicInvitePopover {onCreateMagicInvite} />
		</div>
	</Card.Header>

	<Card.Content class="space-y-1">
		{#if sortedInvites.length === 0}
			<div class="py-8 text-center">
				<p class="text-sm text-muted-foreground">No invitations sent yet</p>
			</div>
		{:else}
			<!-- Pending count summary -->
			<div class="border-b py-4">
				<p class="text-sm text-muted-foreground">
					{pendingCount} pending, {magicInvitesWithMailRecord.length - pendingCount} accepted/expired
				</p>
			</div>

			<!-- Invitations list -->
			{#each sortedInvites as invite (invite.magicInvite.id)}
				{@const status = getInviteStatus(invite.magicInvite)}
				<div class="flex items-center justify-between gap-4 border-b py-4 last:border-b-0">
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{invite.magicInvite.email}</p>
						<div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
							<Badge variant={getStatusBadgeVariant(status)} class="text-xs">
								{status}
							</Badge>
							<span class="text-xs text-muted-foreground">
								{#if status === 'accepted'}
									Joined {formatDate(invite.magicInvite.used_at || invite.magicInvite.created_at)}
								{:else if status === 'expired'}
									Expired {formatDate(invite.magicInvite.expires_at)}
								{:else}
									Sent {formatDate(invite.magicInvite.created_at)} · Expires {formatDate(
										invite.magicInvite.expires_at
									)}
								{/if}
								{#if invite.mailRecord.status === 'delivered'}
									· <span class="text-green-600 dark:text-green-400">Delivered</span>
								{:else if invite.mailRecord.status === 'bounced'}
									· <span class="text-destructive">Bounced</span>
								{:else if invite.mailRecord.status === 'failed'}
									· <span class="text-destructive">Failed</span>
								{:else if invite.mailRecord.status === 'complained'}
									· <span class="text-destructive">Marked as spam</span>
								{:else if invite.mailRecord.status === 'delivery_delayed'}
									· <span class="text-yellow-600 dark:text-yellow-400">Delayed</span>
								{/if}
							</span>
						</div>
					</div>

					{#if status === 'pending' || status === 'expired'}
						<div class="shrink-0 pr-0">
							<ConfirmDeleteDialog
								title="Revoke Invitation"
								description="Are you sure you want to revoke the invitation for {invite.magicInvite
									.email}? The email link will no longer work."
								confirmText="Revoke"
								onConfirm={() => handleDeleteMagicLink(invite.magicInvite.id)}
							>
								{#snippet trigger({ props })}
									<Button
										{...props}
										variant="ghost"
										size="icon"
										class="h-8 w-8 text-muted-foreground hover:text-destructive"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								{/snippet}
							</ConfirmDeleteDialog>
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</Card.Content>
</Card.Root>
