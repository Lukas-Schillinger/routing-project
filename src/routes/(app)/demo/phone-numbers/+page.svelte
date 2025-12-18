<script lang="ts">
	import PhoneInput from '$lib/components/PhoneInput.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';

	let phoneNumber = $state('');
	let isValid = $state(false);
</script>

<div class="container mx-auto max-w-md py-8">
	<Card.Root>
		<Card.Header>
			<Card.Title>Phone Number Input</Card.Title>
			<Card.Description>US phone number with as-you-type formatting</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="space-y-2">
				<Label for="phone">Phone Number</Label>
				<PhoneInput id="phone" bind:value={phoneNumber} bind:valid={isValid} />
			</div>

			<div class="rounded-md bg-muted p-3 text-sm space-y-1">
				<p><strong>Raw value:</strong> {phoneNumber || '(empty)'}</p>
				<p>
					<strong>Valid:</strong>
					<span class={isValid ? 'text-green-600' : 'text-red-600'}>{isValid}</span>
				</p>
			</div>
		</Card.Content>
	</Card.Root>
</div>
