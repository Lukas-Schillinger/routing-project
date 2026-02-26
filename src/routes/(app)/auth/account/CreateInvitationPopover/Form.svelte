<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { createInvitationSchema, type Invitation } from '$lib/schemas';
	import type { Role } from '$lib/schemas/user';
	import { invitationsApi } from '$lib/services/api/auth';
	import { roleDescriptions } from '$lib/services/server/permissions';
	import { Check, LoaderCircle, Mail, TriangleAlert } from 'lucide-svelte';
	import { untrack } from 'svelte';
	import { defaults, setMessage, superForm } from 'sveltekit-superforms';
	import { zod4, zod4Client } from 'sveltekit-superforms/adapters';

	let {
		open = $bindable(false),
		onCreateInvitation = () => {}
	}: {
		open: boolean;
		onCreateInvitation?: (invitation: Invitation) => void;
	} = $props();

	const initialData = untrack(() => ({
		email: '',
		role: '' as Role
	}));

	const form = superForm(defaults(initialData, zod4(createInvitationSchema)), {
		SPA: true,
		validators: zod4Client(createInvitationSchema),
		onUpdate: async ({ form: formResult }) => {
			if (!formResult.valid) return;

			try {
				const newInvitation = await invitationsApi.createInvitation(
					formResult.data
				);
				onCreateInvitation(newInvitation);
				open = false;
				form.reset();
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'An unexpected error occurred';
				setMessage(formResult, message);
			}
		}
	});

	const { form: formData, message, enhance, submitting } = form;
</script>

<form method="POST" use:enhance class="space-y-4">
	<div class="space-y-2">
		<div class="flex items-center gap-2">
			<Mail class="h-5 w-5 text-muted-foreground" />
			<h3 class="text-lg font-semibold">Send Team Invitation</h3>
		</div>
		<p class="text-sm text-muted-foreground">
			Invite a new team member to collaborate on route optimization
		</p>
	</div>

	{#if $message}
		<Alert.Root variant="destructive">
			<TriangleAlert class="h-4 w-4" />
			<Alert.Title>Error</Alert.Title>
			<Alert.Description>{$message}</Alert.Description>
		</Alert.Root>
	{/if}

	<Form.Field {form} name="email">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Email Address *</Form.Label>
				<Input
					{...props}
					type="email"
					bind:value={$formData.email}
					placeholder="colleague@company.com"
					disabled={$submitting}
					autocomplete="email"
				/>
			{/snippet}
		</Form.Control>
		<Form.Description>
			The invitation will be sent to this email address
		</Form.Description>
		<Form.FieldErrors />
	</Form.Field>

	<Form.Field {form} name="role">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Role</Form.Label>
				<Select.Root
					type="single"
					value={$formData.role}
					onValueChange={(value) => ($formData.role = value as Role)}
				>
					<Select.Trigger {...props} class="h-7 w-full">
						{$formData.role ? $formData.role : 'select role'}
					</Select.Trigger>
					<Select.Content>
						{#each roleDescriptions as roleDesc (roleDesc.name)}
							<Select.Item
								value={roleDesc.name}
								class="flex flex-col items-start gap-1"
							>
								<div class="text-sm">{roleDesc.name}</div>
								<div class="text-xs text-muted-foreground">
									{roleDesc.desc}
								</div>
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<div class="flex gap-2">
		<Button
			type="button"
			variant="outline"
			class="flex-1"
			onclick={() => (open = false)}
			disabled={$submitting}
		>
			Cancel
		</Button>
		<Form.Button class="flex-1" disabled={$submitting}>
			{#if $submitting}
				<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
				Sending...
			{:else}
				<Check class="mr-2 h-4 w-4" />
				Send Invitation
			{/if}
		</Form.Button>
	</div>
</form>
