<!-- @component Magic Invites management card for account page -->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import type { MagicInvite } from '$lib/schemas';
	import { ApiError } from '$lib/services/api';
	import { magicLinksApi } from '$lib/services/api/auth';
	import { formatDate } from '$lib/utils';
	import { Calendar, UserPlus, Users, X } from 'lucide-svelte';
	import CreateMagicInvitePopover from './CreateMagicInvitePopover.svelte';

	// Props
	let {
		magicInvites,
		onCreateMagicInvite = () => {},
		onDeleteMagicInvite = () => {}
	}: {
		magicInvites: MagicInvite[];
		onCreateMagicInvite: (magicInvite: MagicInvite) => void;
		onDeleteMagicInvite: () => void;
	} = $props();

	let error = $state<string | null>(null);

	async function handleResendInvite(email: string) {
		// TODO: Implement resend invite
		console.log('Resending invite to:', email);
	}

	async function handleDeleteMagicLink(magicLinkId: string) {
		if (
			!window.confirm(
				'Are you sure you want to revoke this invitation? The email cannot be unsent. '
			)
		) {
			return;
		}

		try {
			await magicLinksApi.deleteInvite(magicLinkId);
			onDeleteMagicInvite();
		} catch (err) {
			if (err instanceof ApiError) {
				error = err.message;
			} else {
				error = 'An unexpected error occurred';
			}
		}
	}

	// Helper functions
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
				return 'secondary';
			case 'pending':
				return 'outline';
			default:
				return 'outline';
		}
	}

	function getStatusLabel(status: string) {
		switch (status) {
			case 'accepted':
				return 'Accepted';
			case 'expired':
				return 'Expired';
			case 'pending':
				return 'Pending';
			default:
				return 'Unknown';
		}
	}

	// Sort invites: pending/expired first (newest first), then accepted (oldest first)
	const sortedInvites = $derived(
		[...magicInvites].sort((a, b) => {
			const aStatus = getInviteStatus(a);
			const bStatus = getInviteStatus(b);

			// Accepted invites go to bottom
			if (aStatus === 'accepted' && bStatus !== 'accepted') return 1;
			if (bStatus === 'accepted' && aStatus !== 'accepted') return -1;

			// Within same status group, sort by date
			if (aStatus === 'accepted' && bStatus === 'accepted') {
				// Accepted: oldest first
				return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
			} else {
				// Pending/expired: newest first
				return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
			}
		})
	);

	const pendingCount = $derived(
		magicInvites.filter((invite) => getInviteStatus(invite) === 'pending').length
	);
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<UserPlus class="h-5 w-5" />
				<Card.Title>Team Invitations</Card.Title>
			</div>
			<CreateMagicInvitePopover {onCreateMagicInvite} />
		</div>
		<Card.Description>Manage team member invitations for your organization</Card.Description>
	</Card.Header>

	<Card.Content class="space-y-4">
		<!-- Pending Invites List -->
		<div class="space-y-4">
			<div class="flex items-center gap-2">
				<Users class="h-4 w-4 text-muted-foreground" />
				<h4 class="text-sm font-medium">
					Invitations ({pendingCount} pending, {magicInvites.length - pendingCount} accepted)
				</h4>
			</div>

			{#if magicInvites.length === 0}
				<div class="rounded-lg border border-dashed p-6 text-center">
					<UserPlus class="mx-auto h-8 w-8 text-muted-foreground" />
					<h3 class="mt-2 text-sm font-semibold">No invitations sent</h3>
					<p class="mt-1 text-sm text-muted-foreground">
						Invite team members to collaborate on route optimization
					</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each sortedInvites as invite (invite.id)}
						{@const status = getInviteStatus(invite)}
						{@const isAccepted = status === 'accepted'}
						<div class="flex items-center justify-between py-2 {isAccepted ? 'opacity-60' : ''}">
							<div class="flex items-center gap-3">
								<div>
									<p class="text-sm font-medium {isAccepted ? 'text-muted-foreground' : ''}">
										{invite.email}
									</p>
									<div class="flex items-center gap-2 text-xs text-muted-foreground">
										<Calendar class="h-3 w-3" />
										{#if isAccepted}
											Accepted {formatDate(invite.used_at || invite.created_at)}
										{:else}
											Sent {formatDate(invite.created_at)}
											• Expires {formatDate(invite.expires_at)}
										{/if}
									</div>
								</div>
							</div>

							<div class="flex items-center gap-2">
								<Badge variant={getStatusBadgeVariant(status)}>
									{getStatusLabel(status)}
								</Badge>

								{#if status === 'pending'}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => handleResendInvite(invite.email)}
										disabled
									>
										Resend
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onclick={() => handleDeleteMagicLink(invite.id)}
									>
										<X class="h-4 w-4" />
									</Button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
