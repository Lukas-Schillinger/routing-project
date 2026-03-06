<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ErrorPage from '$lib/components/ErrorPage.svelte';

	const { Story } = defineMeta({
		title: 'Common/ErrorPage',
		component: ErrorPage,
		args: {
			status: 404
		}
	});
</script>

<Story name="Not Found" args={{ status: 404 }} />

<Story name="Bad Request" args={{ status: 400 }} />

<Story name="Unauthorized" args={{ status: 401 }} />

<Story name="Access Denied" args={{ status: 403 }} />

<Story name="Server Error" args={{ status: 500 }} />

<Story name="Unknown Status" args={{ status: 418 }} />
