<!-- @component Admin Plans Page - displays a table of all billing plans with edit functionality -->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Table from '$lib/components/ui/table';
	import { Check, X, Pencil } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Dialog state
	let dialogOpen = $state(false);
	let editingPlan = $state<(typeof data.plans)[0] | null>(null);
	let monthlyCreditsInput = $state(0);
	let isSaving = $state(false);

	function truncateStripeId(id: string): string {
		if (id.length <= 20) return id;
		return `${id.slice(0, 20)}...`;
	}

	function openEditDialog(plan: (typeof data.plans)[0]) {
		editingPlan = plan;
		monthlyCreditsInput = plan.monthly_credits;
		dialogOpen = true;
	}

	function closeDialog() {
		dialogOpen = false;
		editingPlan = null;
		monthlyCreditsInput = 0;
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!editingPlan) return;

		isSaving = true;
		try {
			const response = await fetch(`/api/admin/plans/${editingPlan.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ monthly_credits: monthlyCreditsInput })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to update plan');
			}

			await invalidateAll();
			toast.success('Plan updated successfully');
			closeDialog();
		} catch (error) {
			console.error('Failed to update plan:', error);
			toast.error(
				error instanceof Error ? error.message : 'Failed to update plan'
			);
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Plans | Admin</title>
</svelte:head>

<div class="space-y-6">
	<h1 class="text-2xl font-bold">Plans</h1>

	<Card.Root>
		<Card.Header>
			<Card.Title>All Plans</Card.Title>
			<Card.Description
				>Manage billing plans and their features</Card.Description
			>
		</Card.Header>
		<Card.Content>
			{#if data.plans.length > 0}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Name</Table.Head>
							<Table.Head>Display Name</Table.Head>
							<Table.Head>Stripe Price ID</Table.Head>
							<Table.Head class="text-center">Monthly Credits</Table.Head>
							<Table.Head>Features</Table.Head>
							<Table.Head class="w-20">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.plans as plan (plan.id)}
							<Table.Row>
								<Table.Cell class="font-medium">
									{plan.name}
								</Table.Cell>
								<Table.Cell>
									<Badge variant="secondary">
										{plan.display_name}
									</Badge>
								</Table.Cell>
								<Table.Cell class="font-mono text-sm text-muted-foreground">
									{truncateStripeId(plan.stripe_price_id)}
								</Table.Cell>
								<Table.Cell class="text-center">
									{plan.monthly_credits.toLocaleString()}
								</Table.Cell>
								<Table.Cell>
									<ul class="space-y-1 text-sm">
										{#each Object.entries(plan.features) as [feature, enabled] (feature)}
											<li class="flex items-center gap-2">
												{#if enabled}
													<Check class="h-4 w-4 text-green-600" />
												{:else}
													<X class="h-4 w-4 text-muted-foreground" />
												{/if}
												<span class="text-muted-foreground">
													{feature.replace(/_/g, ' ')}
												</span>
											</li>
										{/each}
									</ul>
								</Table.Cell>
								<Table.Cell>
									<Button
										variant="ghost"
										size="icon"
										onclick={() => openEditDialog(plan)}
									>
										<Pencil class="h-4 w-4" />
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{:else}
				<p class="py-8 text-center text-sm text-muted-foreground">
					No plans found
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Edit Plan</Dialog.Title>
			<Dialog.Description>
				Update the monthly credits for {editingPlan?.display_name}
			</Dialog.Description>
		</Dialog.Header>
		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="space-y-2">
				<Label for="monthly-credits">Monthly Credits</Label>
				<Input
					id="monthly-credits"
					type="number"
					min="0"
					bind:value={monthlyCreditsInput}
					disabled={isSaving}
				/>
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={closeDialog}>
					Cancel
				</Button>
				<Button type="submit" disabled={isSaving}>
					{#if isSaving}
						Saving...
					{:else}
						Save Changes
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
