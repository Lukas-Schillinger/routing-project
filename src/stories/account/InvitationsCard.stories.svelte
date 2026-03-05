<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import InvitationsCard from '../../routes/(app)/auth/account/InvitationsCard.svelte';
	import {
		createMockInvitationRow,
		createMockMailRecordRow
	} from '$lib/testing/factories/mocks';

	const orgId = crypto.randomUUID();

	const pendingInvite = createMockInvitationRow({
		organization_id: orgId,
		email: 'pending@acme.com',
		expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
	});
	const pendingMail = createMockMailRecordRow({
		organization_id: orgId,
		to_email: 'pending@acme.com',
		status: 'delivered'
	});

	const acceptedInvite = createMockInvitationRow({
		organization_id: orgId,
		email: 'accepted@acme.com',
		used_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
		expires_at: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000)
	});
	const acceptedMail = createMockMailRecordRow({
		organization_id: orgId,
		to_email: 'accepted@acme.com',
		status: 'delivered'
	});

	const { Story } = defineMeta({
		title: 'Account/InvitationsCard',
		component: InvitationsCard,
		args: {
			invitationsWithMailRecord: [
				{ invitation: pendingInvite, mailRecord: pendingMail },
				{ invitation: acceptedInvite, mailRecord: acceptedMail }
			],
			onCreateInvitation: () => {},
			onDeleteInvitation: () => {}
		}
	});
</script>

<Story name="Default" />

<Story name="Empty" args={{ invitationsWithMailRecord: [] }} />

<Story name="Revoke Error" args={{ error: 'Failed to revoke invitation' }} />
