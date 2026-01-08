<script lang="ts">
	import { backOut, cubicOut } from 'svelte/easing';
	import { fade, fly, scale } from 'svelte/transition';

	const cards = [
		{
			id: 'purpose-built',
			title: 'Purpose-built for product development',
			description:
				'Linear was developed with a specific purpose: to empower product teams to do their best work. Every aspect is intentionally designed to help teams focus on what they do best: Planning, building, and shipping great products.',
			fullDescription:
				"Because of its fit-to-purpose design, Linear is incredibly easy to use, but grows more powerful as you scale. It's principled where it needs to be, but provides enough flexibility to adapt to your team's unique way of working."
		},
		{
			id: 'move-fast',
			title: 'Designed to move fast',
			subtitle: '50ms',
			description:
				'Linear is built in pursuit of high-performance. With its keyboard-first design, realtime sync, and zero-friction workflows, it delivers a focused experience ideal for fast-paced development environments.',
			fullDescription:
				"Linear's obsessive focus on speed not only results in improved developer experience, but also accelerates the pace of work itself. Operations that used to take seconds now happen in milliseconds. You can see, respond to, and act on information faster than ever before."
		},
		{
			id: 'crafted',
			title: 'Crafted to perfection',
			description:
				'Every pixel, every interaction, every detail has been meticulously considered. Linear represents a new standard for what software tools can be when craft is prioritized.',
			fullDescription:
				'We believe that tools shape how we work. A well-crafted tool inspires better work. Linear is designed to feel like an extension of your thought process, not an obstacle to overcome.'
		}
	];

	let selectedId = $state<string | null>(null);
	let selectedCard = $derived(cards.find((c) => c.id === selectedId));

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && selectedId) {
			selectedId = null;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-screen bg-[#0a0a0a] px-6 py-20 font-sans">
	<!-- Header -->
	<div class="mx-auto mb-6 max-w-[1100px]">
		<h2 class="mb-3 text-[32px] font-semibold tracking-[-0.03em] text-white">
			Made for modern product teams
		</h2>
		<p class="max-w-[500px] text-base leading-relaxed text-white/50">
			Linear is shaped by the practices and principles that distinguish
			world-class product teams from the rest.
		</p>
	</div>

	<!-- Cards Grid -->
	<div class="mx-auto grid max-w-[1100px] grid-cols-1 gap-3 md:grid-cols-3">
		{#each cards as card (card.id)}
			<button
				type="button"
				onclick={() => (selectedId = card.id)}
				class="relative cursor-pointer overflow-hidden rounded-2xl border border-white/8 text-left"
				style="background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);"
			>
				<!-- Illustration area -->
				<div
					class="h-[200px]"
					style="background: linear-gradient(180deg, rgba(20,20,20,1) 0%, rgba(15,15,15,1) 100%);"
				>
					{#if card.id === 'purpose-built'}
						<div
							class="relative flex h-full w-full items-center justify-center"
						>
							{#each [0, 1, 2, 3, 4] as i (i)}
								<div
									class="absolute rounded-lg border border-white/10"
									style="
										width: 100px;
										height: 70px;
										transform: translateX({-60 + i * 35}px) translateY({-15 +
										i * 10}px) rotateY(-25deg) rotateX(15deg);
										background: {i === 4
										? 'linear-gradient(145deg, rgba(60,60,60,0.9) 0%, rgba(40,40,40,0.9) 100%)'
										: 'linear-gradient(145deg, rgba(45,45,45,0.6) 0%, rgba(30,30,30,0.6) 100%)'};
										box-shadow: {i === 4 ? '0 10px 40px rgba(0,0,0,0.4)' : 'none'};
									"
								>
									<div class="p-3 opacity-40">
										<div
											class="mb-1.5 h-1.5 w-3/5 rounded-sm bg-white/30"
										></div>
										<div class="mb-1 h-1 w-4/5 rounded-sm bg-white/15"></div>
										<div class="h-1 w-1/2 rounded-sm bg-white/15"></div>
									</div>
								</div>
							{/each}
							<div
								class="absolute shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
								style="
									right: 20%;
									bottom: 10%;
									width: 60px;
									height: 60px;
									background: linear-gradient(135deg, rgba(80,80,80,0.8) 0%, rgba(50,50,50,0.8) 100%);
									border-radius: 50% 50% 50% 0;
									transform: rotate(-45deg);
								"
							></div>
						</div>
					{:else if card.id === 'move-fast'}
						<div
							class="relative flex h-full w-full flex-col items-center justify-center overflow-hidden"
						>
							<div
								class="z-2 mb-5 font-mono text-[32px] font-medium tracking-tight text-white/70"
							>
								50ms
							</div>
							{#each Array(12), i}
								<div
									class="absolute h-0.5 rounded-sm"
									style="
										width: {40 + (i % 4) * 20}px;
										left: {10 + (i % 5) * 15}%;
										top: {25 + i * 5}%;
										background: linear-gradient(90deg, rgba(255,255,255,{0.6 -
										i * 0.04}) 0%, transparent 100%);
										transform: translateX({-30 + (i % 3) * 18}px) rotate({25 + i * 0.5}deg);
									"
								></div>
							{/each}
						</div>
					{:else if card.id === 'crafted'}
						<div
							class="relative flex h-full w-full items-center justify-center"
						>
							<div
								class="absolute inset-[10%]"
								style="
									background-image:
										linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
										linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
									background-size: 20px 20px;
									transform: perspective(500px) rotateX(30deg);
								"
							></div>
							<div
								class="z-2 flex items-center gap-2 rounded-md border border-white/15 px-4 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
								style="background: linear-gradient(145deg, rgba(70,70,70,0.9) 0%, rgba(50,50,50,0.9) 100%);"
							>
								<span class="text-sm font-medium text-white/90">Create</span>
								<div
									class="flex h-5 w-5 items-center justify-center rounded bg-white/10 text-sm text-white/60"
								>
									+
								</div>
							</div>
							<div
								class="absolute top-1/4 left-[20%] h-[100px] w-[150px] rounded border border-dashed border-white/20 opacity-50"
							>
								<div
									class="absolute -top-1 -left-1 h-2 w-2 rounded-sm bg-white/40"
								></div>
								<div
									class="absolute -right-1 -bottom-1 h-2 w-2 rounded-sm bg-white/40"
								></div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Content -->
				<div class="p-6">
					<h3
						class="text-lg leading-tight font-semibold tracking-[-0.02em] text-white"
					>
						{card.title}
					</h3>
					<div
						class="absolute right-5 bottom-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-lg text-white/50"
					>
						+
					</div>
				</div>
			</button>
		{/each}
	</div>

	<!-- Modal Overlay -->
	{#if selectedId && selectedCard}
		<!-- Backdrop -->
		<button
			type="button"
			class="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md"
			transition:fade={{ duration: 300 }}
			onclick={() => (selectedId = null)}
			aria-label="Close modal"
		></button>

		<!-- Modal -->
		<div
			class="pointer-events-none fixed inset-0 z-[101] flex items-center justify-center p-6"
		>
			<div
				class="pointer-events-auto relative max-h-[90vh] w-full max-w-[680px] overflow-hidden rounded-[20px] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.5)]"
				style="background: linear-gradient(180deg, rgba(30,30,30,1) 0%, rgba(22,22,22,1) 100%);"
				transition:scale={{ duration: 400, easing: cubicOut, start: 0.9 }}
			>
				<!-- Close button -->
				<button
					type="button"
					onclick={() => (selectedId = null)}
					class="absolute top-4 right-4 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/5 text-xl text-white/60"
					transition:fade={{ delay: 200 }}
				>
					&times;
				</button>

				<!-- Expanded Illustration -->
				<div
					class="h-[280px]"
					style="background: linear-gradient(180deg, rgba(20,20,20,1) 0%, rgba(18,18,18,1) 100%);"
				>
					{#if selectedCard.id === 'purpose-built'}
						<div
							class="relative flex h-full w-full items-center justify-center"
						>
							{#each [0, 1, 2, 3, 4] as i (i)}
								<div
									class="absolute rounded-lg border border-white/10 transition-all duration-500"
									style="
										width: 140px;
										height: 100px;
										transform: translateX({-80 + i * 45}px) translateY({-20 +
										i * 12}px) rotateY(-25deg) rotateX(15deg);
										background: {i === 4
										? 'linear-gradient(145deg, rgba(60,60,60,0.9) 0%, rgba(40,40,40,0.9) 100%)'
										: 'linear-gradient(145deg, rgba(45,45,45,0.6) 0%, rgba(30,30,30,0.6) 100%)'};
										box-shadow: {i === 4 ? '0 10px 40px rgba(0,0,0,0.4)' : 'none'};
									"
								>
									<div class="p-3 opacity-40">
										<div
											class="mb-1.5 h-1.5 w-3/5 rounded-sm bg-white/30"
										></div>
										<div class="mb-1 h-1 w-4/5 rounded-sm bg-white/15"></div>
										<div class="h-1 w-1/2 rounded-sm bg-white/15"></div>
									</div>
								</div>
							{/each}
							<div
								class="absolute shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-500"
								style="
									right: 15%;
									bottom: 15%;
									width: 80px;
									height: 80px;
									background: linear-gradient(135deg, rgba(80,80,80,0.8) 0%, rgba(50,50,50,0.8) 100%);
									border-radius: 50% 50% 50% 0;
									transform: rotate(-45deg) scale(1.2);
								"
							></div>
						</div>
					{:else if selectedCard.id === 'move-fast'}
						<div
							class="relative flex h-full w-full flex-col items-center justify-center overflow-hidden"
						>
							<div
								class="z-2 mb-5 -translate-y-5 scale-125 font-mono text-[48px] font-medium tracking-tight text-white/70 transition-all duration-500"
							>
								50ms
							</div>
							{#each Array(12), i}
								<div
									class="absolute h-0.5 rounded-sm transition-all duration-500"
									style="
										width: {60 + (i % 4) * 30}px;
										left: {10 + (i % 5) * 15}%;
										top: {25 + i * 5}%;
										background: linear-gradient(90deg, rgba(255,255,255,{0.6 -
										i * 0.04}) 0%, transparent 100%);
										transform: translateX({-40 + (i % 3) * 25}px) rotate({25 + i * 0.5}deg);
										transition-delay: {i * 20}ms;
									"
								></div>
							{/each}
						</div>
					{:else if selectedCard.id === 'crafted'}
						<div
							class="relative flex h-full w-full items-center justify-center"
						>
							<div
								class="absolute inset-[10%]"
								style="
									background-image:
										linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
										linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
									background-size: 20px 20px;
									transform: perspective(500px) rotateX(30deg);
								"
							></div>
							<div
								class="z-2 flex -translate-y-2.5 scale-[1.15] items-center gap-2 rounded-md border border-white/15 px-4 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-500"
								style="background: linear-gradient(145deg, rgba(70,70,70,0.9) 0%, rgba(50,50,50,0.9) 100%);"
							>
								<span class="text-sm font-medium text-white/90">Create</span>
								<div
									class="flex h-5 w-5 items-center justify-center rounded bg-white/10 text-sm text-white/60"
								>
									+
								</div>
							</div>
							<div
								class="absolute top-1/4 left-[20%] h-[100px] w-[150px] rounded border border-dashed border-white/20 opacity-80 transition-opacity duration-500"
							>
								<div
									class="absolute -top-1 -left-1 h-2 w-2 rounded-sm bg-white/40"
								></div>
								<div
									class="absolute -right-1 -bottom-1 h-2 w-2 rounded-sm bg-white/40"
								></div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Content -->
				<div class="px-10 py-8 pb-10">
					<h2
						class="mb-5 text-[28px] leading-tight font-semibold tracking-[-0.02em] text-white"
					>
						{selectedCard.title}
					</h2>

					<p
						class="mb-4 text-base leading-relaxed text-white/60"
						transition:fly={{
							y: 12,
							duration: 500,
							delay: 200,
							easing: backOut
						}}
					>
						{selectedCard.description}
					</p>

					<p
						class="text-base leading-relaxed text-white/60"
						transition:fly={{
							y: 12,
							duration: 500,
							delay: 350,
							easing: backOut
						}}
					>
						{selectedCard.fullDescription}
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Explanation -->
	<div
		class="mx-auto mt-20 max-w-[700px] rounded-xl border border-white/6 bg-white/3 px-8 py-7"
		in:fly={{ y: 20, duration: 300, delay: 300 }}
	>
		<h3 class="mb-4 text-base font-semibold text-white">How This Works</h3>
		<div class="text-sm leading-relaxed text-white/50">
			<p class="mb-3">
				<strong class="text-white/80">Svelte Transitions:</strong> Elements use built-in
				Svelte transitions like fade, fly, and scale for smooth enter/exit animations.
			</p>
			<p class="mb-3">
				<strong class="text-white/80">Key components:</strong> The card container,
				illustration area, and content sections animate with CSS transitions and
				Svelte's transition directives.
			</p>
			<p>
				<strong class="text-white/80">Content reveal:</strong> Description text uses
				fly transitions with staggered delays for a polished feel.
			</p>
		</div>
	</div>
</div>
