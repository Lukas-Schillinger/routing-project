<!-- @component Organization card for account page -->
<script lang="ts">
	import { EditOrganizationPopover } from '$lib/components/EditOrganizationPopover';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import * as Table from '$lib/components/ui/table';
	import type { Organization, PublicUser } from '$lib/schemas';
	import { formatDate } from '$lib/utils';
	import { Building2, Calendar, Users } from 'lucide-svelte';

	// Props
	let {
		organization = $bindable(),
		organizationUsers
	}: {
		organization: Organization;
		organizationUsers: PublicUser[];
	} = $props();
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<Building2 class="h-5 w-5" />
				<Card.Title>Organization</Card.Title>
			</div>
			<EditOrganizationPopover
				{organization}
				onSuccess={(updatedOrganization) => {
					organization = updatedOrganization;
				}}
			/>
		</div>
		<Card.Description>Manage your organization settings and information</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-4">
		<div class="space-y-4">
			<div class="flex items-center gap-3">
				<Building2 class="h-4 w-4 text-muted-foreground" />
				<div>
					<Label class="text-sm font-medium">Organization Name</Label>
					<p class="text-sm text-muted-foreground">{organization.name}</p>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<Calendar class="h-4 w-4 text-muted-foreground" />
				<div>
					<Label class="text-sm font-medium">Created</Label>
					<p class="text-sm text-muted-foreground">
						{formatDate(organization.created_at)}
					</p>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<Users class="h-4 w-4 text-muted-foreground" />
				<div>
					<Label class="text-sm font-medium">Organization ID</Label>
					<p class="font-mono text-sm text-muted-foreground">{organization.id}</p>
				</div>
			</div>

			<!-- Users Table -->
			<div class="pt-4">
				<Label class="text-sm font-medium">Members ({organizationUsers.length})</Label>
				<div class="mt-2">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Email</Table.Head>
								<Table.Head>Joined</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each organizationUsers as user (user.id)}
								<Table.Row>
									<Table.Cell class="font-medium">{user.email}</Table.Cell>
									<Table.Cell class="text-muted-foreground">
										{formatDate(user.created_at)}
									</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={2} class="text-center text-muted-foreground">
										No users in this organization
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</div>
		</div>
	</Card.Content>
</Card.Root>
