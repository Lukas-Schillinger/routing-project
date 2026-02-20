<!-- @component Invitations management card for account page -->
<script lang="ts">
	import { ConfirmDeleteDialog } from '$lib/components/ConfirmDeleteDialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import type { Invitation, MailRecord } from '$lib/schemas';
	import { ServiceError } from '$lib/errors';
	import { invitationsApi } from '$lib/services/api/auth';
	import { formatDate } from '$lib/utils';
	import { Mail, Trash2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import CreateInvitationPopover from './CreateInvitationPopover/CreateInvitationPopover.svelte';

	// Props
	let {
		invitationsWithMailRecord,
		onCreateInvitation = () => {},
		onDeleteInvitation = () => {}
	}: {
		invitationsWithMailRecord: {
			invitation: Invitation;
			mailRecord: MailRecord;
		}[];
		onCreateInvitation: (invitation: Invitation) => void;
		onDeleteInvitation: () => void;
	} = $props();

	async function handleDeleteInvitation(invitationId: string) {
		try {
			await invitationsApi.deleteInvitation(invitationId);
			onDeleteInvitation();
			toast.success('Invitation revoked');
		} catch (err) {
			if (err instanceof ServiceError) {
				toast.error(err.message);
			} else {
				toast.error('Failed to revoke invitation');
			}
		}
	}

	function getInviteStatus(invitation: Invitation) {
		if (invitation.used_at) return 'accepted';
		if (invitation.expires_at < new Date()) return 'expired';
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
		[...invitationsWithMailRecord].sort((a, b) => {
			const aStatus = getInviteStatus(a.invitation);
			const bStatus = getInviteStatus(b.invitation);

			const order = { pending: 0, expired: 1, accepted: 2 };
			if (order[aStatus] !== order[bStatus]) {
				return order[aStatus] - order[bStatus];
			}

			// Within same status, newest first
			return (
				new Date(b.invitation.created_at).getTime() -
				new Date(a.invitation.created_at).getTime()
			);
		})
	);

	const pendingCount = $derived(
		invitationsWithMailRecord.filter(
			(invite) => getInviteStatus(invite.invitation) === 'pending'
		).length
	);
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-start justify-between gap-4">
			<div>
				<Card.Title>Team Invitations</Card.Title>
				<Card.Description
					>Invite new members to your organization</Card.Description
				>
			</div>
			<CreateInvitationPopover {onCreateInvitation} />
		</div>
	</Card.Header>

	<Card.Content class="space-y-1">
		{#if sortedInvites.length === 0}
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon">
						<Mail />
					</Empty.Media>
					<Empty.Title>No invitations</Empty.Title>
					<Empty.Description>
						Invitations you send to team members will appear here.
					</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		{:else}
			<!-- Pending count summary -->
			<div class="border-b py-4">
				<p class="text-sm text-muted-foreground">
					{pendingCount} pending, {invitationsWithMailRecord.length -
						pendingCount} accepted/expired
				</p>
			</div>

			<!-- Invitations list -->
			{#each sortedInvites as invite (invite.invitation.id)}
				{@const status = getInviteStatus(invite.invitation)}
				<div
					class="flex items-center justify-between gap-4 border-b py-4 last:border-b-0"
				>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">
							{invite.invitation.email}
						</p>
						<div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
							<Badge variant={getStatusBadgeVariant(status)} class="text-xs">
								{status}
							</Badge>
							<span class="text-xs text-muted-foreground">
								{#if status === 'accepted'}
									Joined {formatDate(
										invite.invitation.used_at || invite.invitation.created_at
									)}
								{:else if status === 'expired'}
									Expired {formatDate(invite.invitation.expires_at)}
								{:else}
									Sent {formatDate(invite.invitation.created_at)} · Expires {formatDate(
										invite.invitation.expires_at
									)}
								{/if}
								{#if invite.mailRecord.status === 'delivered'}
									· <span class="text-muted-foreground">Delivered</span>
								{:else if invite.mailRecord.status === 'bounced'}
									· <span class="text-destructive">Bounced</span>
								{:else if invite.mailRecord.status === 'failed'}
									· <span class="text-destructive">Failed</span>
								{:else if invite.mailRecord.status === 'complained'}
									· <span class="text-destructive">Marked as spam</span>
								{:else if invite.mailRecord.status === 'delivery_delayed'}
									· <span class="text-warning-foreground">Delayed</span>
								{/if}
							</span>
						</div>
					</div>

					{#if status === 'pending' || status === 'expired'}
						<div class="shrink-0 pr-0">
							<ConfirmDeleteDialog
								title="Revoke Invitation"
								description="Are you sure you want to revoke the invitation for {invite
									.invitation.email}? The email link will no longer work."
								confirmText="Revoke"
								onConfirm={() => handleDeleteInvitation(invite.invitation.id)}
							>
								{#snippet trigger({ props })}
									<Button
										{...props}
										variant="ghost"
										size="icon"
										class="h-8 w-8 text-muted-foreground hover:text-destructive"
										aria-label="Cancel invitation"
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
