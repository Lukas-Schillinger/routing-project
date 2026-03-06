<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import OrganizationCard from '../../routes/(app)/auth/account/OrganizationCard.svelte';
	import {
		createMockOrganizationRow,
		createMockPublicUserRow,
		ALL_PERMISSIONS
	} from '$lib/testing/factories/mocks';

	const org = createMockOrganizationRow({ name: 'Acme Corp' });
	const admin = createMockPublicUserRow({
		organization_id: org.id,
		email: 'admin@acme.com',
		name: 'Admin User',
		role: 'admin'
	});
	const member = createMockPublicUserRow({
		organization_id: org.id,
		email: 'member@acme.com',
		name: 'Team Member',
		role: 'member'
	});

	const { Story } = defineMeta({
		title: 'Account/OrganizationCard',
		component: OrganizationCard,
		args: {
			organization: org,
			organizationUsers: [admin, member],
			currentUser: admin,
			permissions: ALL_PERMISSIONS
		}
	});
</script>

<Story name="Default" />

<Story
	name="Name Error"
	args={{ nameError: 'Failed to update organization' }}
/>

<Story name="Role Error" args={{ roleError: 'Failed to update role' }} />
