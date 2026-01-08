<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import Home from 'lucide-svelte/icons/home';
	import RotateCcw from 'lucide-svelte/icons/rotate-ccw';
	import { SmileyXEyes } from 'phosphor-svelte';

	const errorMessages: Record<number, { title: string; description: string }> =
		{
			400: {
				title: 'Bad Request',
				description:
					"The request couldn't be understood. Please check and try again."
			},
			401: {
				title: 'Unauthorized',
				description: 'You need to sign in to access this page.'
			},
			403: {
				title: 'Access Denied',
				description: "You don't have permission to view this page."
			},
			404: {
				title: 'Page Not Found',
				description: "We looked and couldn't find anything there."
			},
			500: {
				title: 'Server Error',
				description: 'Something went wrong on our end.'
			}
		};

	const status = $derived(page.status);
	const errorInfo = $derived(
		errorMessages[status] || {
			title: 'Something Went Wrong',
			description: 'An unexpected error occurred.'
		}
	);
</script>

<div
	class="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-background px-6 py-12"
>
	<!-- Main content -->
	<div class="relative z-10 flex max-w-lg flex-col items-center text-center">
		<!-- Giant icon -->
		<SmileyXEyes
			class="mb-4 size-32 text-muted-foreground/30 md:size-48"
			weight="thin"
		/>

		<!-- Status code -->
		<span
			class="mb-2 font-serif text-7xl font-semibold tracking-tight text-foreground md:text-6xl"
		>
			{status}
		</span>

		<!-- Error title -->
		<h1 class="mb-3 text-2xl font-semibold text-foreground md:text-3xl">
			{errorInfo.title}
		</h1>

		<!-- Error description -->
		<p class="mb-8 max-w-md text-base leading-relaxed text-muted-foreground">
			{errorInfo.description}
		</p>

		<!-- Action buttons -->
		<div class="flex flex-row gap-3">
			<Button variant="outline" onclick={() => history.back()} class="gap-2">
				<ArrowLeft class="size-4" />
				Go Back
			</Button>
			<Button variant="default" href="/" class="gap-2">
				<Home class="size-4" />
				Go Home
			</Button>
			<Button variant="ghost" onclick={() => location.reload()} class="gap-2">
				<RotateCcw class="size-4" />
				Retry
			</Button>
		</div>
	</div>
</div>
