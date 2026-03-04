<!-- @component Admin Organizations Page - displays a table of all organizations with subscription info -->
<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { INVALIDATION_KEYS } from '$lib/invalidation-keys';
	import { resolve } from '$app/paths';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { createTestAccountSchema } from '$lib/schemas';
	import { ServiceError } from '$lib/errors';
	import { adminApi } from '$lib/services/api';
	import * as Table from '$lib/components/ui/table';
	import { formatDate } from '$lib/utils';
	import Plus from '@lucide/svelte/icons/plus';
	import { toast } from 'svelte-sonner';
	import { defaults, setMessage, superForm } from 'sveltekit-superforms';
	import { zod4, zod4Client } from 'sveltekit-superforms/adapters';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Create account dialog state
	let dialogOpen = $state(false);

	function generateTestData() {
		const id = Math.random().toString(36).substring(2, 8);
		return {
			email: `test-${id}@example.com`,
			name: `Test User ${id}`,
			organizationName: `Test Org ${id}`
		};
	}

	const accountForm = superForm(
		defaults(generateTestData(), zod4(createTestAccountSchema)),
		{
			SPA: true,
			validators: zod4Client(createTestAccountSchema),
			onUpdate: async ({ form }) => {
				if (!form.valid) return;

				try {
					const result = await adminApi.createTestAccount(form.data);
					toast.success('Test account created');
					dialogOpen = false;
					await invalidate(INVALIDATION_KEYS.ADMIN);
					goto(resolve(`/admin/organizations/${result.organization.id}`));
				} catch (err) {
					const message =
						err instanceof ServiceError
							? err.message
							: 'Failed to create account';
					setMessage(form, message);
				}
			}
		}
	);

	const {
		form: accountFormData,
		message: accountMessage,
		enhance: accountEnhance,
		submitting: accountSubmitting
	} = accountForm;

	function handleDialogOpen(open: boolean) {
		dialogOpen = open;
		if (open) {
			const testData = generateTestData();
			$accountFormData.email = testData.email;
			$accountFormData.name = testData.name;
			$accountFormData.organizationName = testData.organizationName;
		}
	}

	function getPlanBadgeVariant(
		planName: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		if (planName === 'pro') return 'default';
		return 'secondary';
	}

	function getStatusBadgeVariant(
		status: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		const activeStatuses = ['active'];
		const warningStatuses = ['past_due', 'unpaid'];
		const inactiveStatuses = [
			'canceled',
			'incomplete',
			'incomplete_expired',
			'paused'
		];

		if (activeStatuses.includes(status)) return 'default';
		if (warningStatuses.includes(status)) return 'destructive';
		if (inactiveStatuses.includes(status)) return 'outline';
		return 'secondary';
	}

	function formatStatus(status: string): string {
		return status
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}
</script>

<svelte:head>
	<title>Organizations | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Organizations</h1>
		<Dialog.Root open={dialogOpen} onOpenChange={handleDialogOpen}>
			<Dialog.Trigger>
				{#snippet child({ props })}
					<Button {...props}>
						<Plus class="h-4 w-4" />
						Create Test Account
					</Button>
				{/snippet}
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Create Test Account</Dialog.Title>
					<Dialog.Description>
						Create a new organization with admin user on Free tier.
					</Dialog.Description>
				</Dialog.Header>
				{#if $accountMessage}
					<Alert.Root variant="destructive">
						<Alert.Description>{$accountMessage}</Alert.Description>
					</Alert.Root>
				{/if}
				<form method="POST" use:accountEnhance class="space-y-4">
					<Form.Field form={accountForm} name="email">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Email *</Form.Label>
								<Input
									{...props}
									type="email"
									placeholder="test@example.com"
									bind:value={$accountFormData.email}
									disabled={$accountSubmitting}
								/>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field form={accountForm} name="name">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>User Name</Form.Label>
								<Input
									{...props}
									type="text"
									placeholder="Test User"
									bind:value={$accountFormData.name}
									disabled={$accountSubmitting}
								/>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field form={accountForm} name="organizationName">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Organization Name</Form.Label>
								<Input
									{...props}
									type="text"
									placeholder="Test Organization"
									bind:value={$accountFormData.organizationName}
									disabled={$accountSubmitting}
								/>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
					<Dialog.Footer>
						<Button
							type="button"
							variant="outline"
							onclick={() => (dialogOpen = false)}
							disabled={$accountSubmitting}
						>
							Cancel
						</Button>
						<Form.Button disabled={$accountSubmitting}>
							{$accountSubmitting ? 'Creating...' : 'Create Account'}
						</Form.Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>All Organizations</Card.Title>
			<Card.Description>
				Manage and view all registered organizations
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.organizations.length > 0}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Name</Table.Head>
							<Table.Head class="text-center">Users</Table.Head>
							<Table.Head>Plan</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Created</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.organizations as organization (organization.id)}
							<Table.Row>
								<Table.Cell class="font-medium">
									<a
										href={resolve(`/admin/organizations/${organization.id}`)}
										class="text-primary hover:underline"
									>
										{organization.name}
									</a>
								</Table.Cell>
								<Table.Cell class="text-center">
									{organization.userCount}
								</Table.Cell>
								<Table.Cell>
									<Badge variant={getPlanBadgeVariant(organization.plan)}>
										{organization.plan === 'pro' ? 'Pro' : 'Free'}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									<Badge
										variant={getStatusBadgeVariant(
											organization.subscription_status ?? 'free'
										)}
									>
										{formatStatus(organization.subscription_status ?? 'free')}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{formatDate(organization.created_at)}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{:else}
				<p class="py-8 text-center text-sm text-muted-foreground">
					No organizations found
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
