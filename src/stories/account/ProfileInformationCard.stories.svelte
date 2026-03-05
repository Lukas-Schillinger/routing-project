<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ProfileInformationCard from '../../routes/(app)/auth/account/ProfileInformationCard.svelte';
	import { createMockPublicUserRow } from '$lib/testing/factories/mocks';

	const user = createMockPublicUserRow({
		email: 'jane@acme.com',
		name: 'Jane Smith',
		role: 'admin'
	});

	const { Story } = defineMeta({
		title: 'Account/ProfileInformationCard',
		component: ProfileInformationCard,
		args: {
			user
		}
	});
</script>

<Story name="Default" />

<Story name="Update Error" args={{ error: 'Failed to update profile' }} />
