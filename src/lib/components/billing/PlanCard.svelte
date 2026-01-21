<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';

	type Props = {
		planName: string;
		displayName: string;
		price: number;
		renewalDate: Date;
		isScheduledDowngrade?: boolean;
		onManage?: () => void;
	};

	let {
		planName,
		displayName,
		price,
		renewalDate,
		isScheduledDowngrade = false,
		onManage
	}: Props = $props();

	const formattedDate = $derived(
		renewalDate.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	);

	const renewalLabel = $derived(isScheduledDowngrade ? 'Expires' : 'Renews');
</script>

<Card.Root data-plan={planName}>
	<Card.Header>
		<div class="flex items-center gap-2">
			<Card.Title>{displayName}</Card.Title>
			{#if isScheduledDowngrade}
				<Badge variant="secondary">Downgrade scheduled</Badge>
			{/if}
		</div>
		<Card.Description>${price}/month</Card.Description>
	</Card.Header>
	<Card.Content>
		<p class="text-sm text-muted-foreground">
			{renewalLabel}: {formattedDate}
		</p>
	</Card.Content>
	<Card.Footer>
		<Button variant="outline" onclick={onManage}>Manage Subscription</Button>
	</Card.Footer>
</Card.Root>
