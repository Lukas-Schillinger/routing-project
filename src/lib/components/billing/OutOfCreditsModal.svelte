<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';

	type Props = {
		open: boolean;
		currentBalance: number;
		requiredCredits: number;
		onBuyCredits?: () => void;
		onUpgrade?: () => void;
	};

	let {
		open = $bindable(false),
		currentBalance,
		requiredCredits,
		onBuyCredits,
		onUpgrade
	}: Props = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Insufficient Credits</Dialog.Title>
			<Dialog.Description>
				This optimization requires {requiredCredits} credits, but you only have {currentBalance}.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => onUpgrade?.()}>
				Upgrade Plan
			</Button>
			<Button onclick={() => onBuyCredits?.()}>Buy Credits</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
