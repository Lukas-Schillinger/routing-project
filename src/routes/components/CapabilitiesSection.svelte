<script lang="ts">
	import { Cpu, FolderOpen, ListChecks, PaperPlaneTilt } from 'phosphor-svelte';
	import { ArrowRight, Upload, Zap, Send, CheckCircle2 } from 'lucide-svelte';
</script>

<section class="bg-forest-950 px-4 py-24 md:px-8 md:py-32">
	<div class="mx-auto max-w-6xl">
		<!-- Section Header -->
		<div class="mb-16 text-center">
			<p
				class="mb-4 text-sm font-medium tracking-[0.2em] text-forest-400 uppercase"
			>
				Capabilities
			</p>
			<h2
				class="font-serif text-4xl leading-tight tracking-tight text-white md:text-5xl"
			>
				Built for speed.<br />Designed for scale.
			</h2>
		</div>

		<!-- Bento Grid -->
		<div
			class="grid auto-rows-[minmax(200px,auto)] grid-cols-1 gap-4 md:grid-cols-6 md:gap-5"
		>
			<!-- Card 1: Data Uploads - Large -->
			<div
				class="group relative col-span-1 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-forest-900/80 to-forest-950 p-8 md:col-span-4"
			>
				<div class="relative z-10 flex h-full flex-col">
					<div
						class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20"
					>
						<Upload class="h-5 w-5 text-emerald-400" />
					</div>
					<h3 class="mb-2 text-xl font-semibold text-white">
						Intelligent Data Uploads
					</h3>
					<p class="mb-6 max-w-md text-sm leading-relaxed text-forest-300">
						Import stops from CSV, Excel, or paste directly. Our parser handles
						messy data and maps columns automatically.
					</p>

					<!-- Mock UI Element -->
					<div class="mt-auto">
						<div
							class="overflow-hidden rounded-xl border border-white/[0.06] bg-forest-900/50 shadow-2xl"
						>
							<div
								class="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3"
							>
								<div class="h-2.5 w-2.5 rounded-full bg-forest-600"></div>
								<div class="h-2.5 w-2.5 rounded-full bg-forest-700"></div>
								<div class="h-2.5 w-2.5 rounded-full bg-forest-700"></div>
								<span class="ml-2 text-xs text-forest-500"
									>stops_march_2024.csv</span
								>
							</div>
							<div class="p-4">
								<div class="space-y-2">
									<div class="flex items-center gap-3">
										<div class="h-3 w-20 rounded bg-forest-800"></div>
										<ArrowRight class="h-3 w-3 text-forest-600" />
										<div
											class="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400"
										>
											Address
										</div>
									</div>
									<div class="flex items-center gap-3">
										<div class="h-3 w-16 rounded bg-forest-800"></div>
										<ArrowRight class="h-3 w-3 text-forest-600" />
										<div
											class="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400"
										>
											Name
										</div>
									</div>
									<div class="flex items-center gap-3">
										<div class="h-3 w-24 rounded bg-forest-800"></div>
										<ArrowRight class="h-3 w-3 text-forest-600" />
										<div
											class="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400"
										>
											Time Window
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Gradient orb -->
				<div
					class="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"
				></div>
			</div>

			<!-- Card 2: Optimization - Tall -->
			<div
				class="group relative col-span-1 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-forest-900/80 to-forest-950 p-8 md:col-span-2 md:row-span-2"
			>
				<div class="relative z-10 flex h-full flex-col">
					<div
						class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20"
					>
						<Zap class="h-5 w-5 text-amber-400" />
					</div>
					<h3 class="mb-2 text-xl font-semibold text-white">
						One Click Optimization
					</h3>
					<p class="mb-8 text-sm leading-relaxed text-forest-300">
						Advanced algorithms find the fastest routes across your entire
						fleet. Balances time windows, capacity, and driver schedules.
					</p>

					<!-- Animated metrics visualization -->
					<div class="mt-auto space-y-4">
						<div
							class="rounded-xl border border-white/[0.06] bg-forest-900/50 p-4"
						>
							<div class="mb-3 flex items-baseline justify-between">
								<span class="text-xs text-forest-500">Routes optimized</span>
								<span class="font-mono text-2xl font-semibold text-white"
									>2.4s</span
								>
							</div>
							<div class="h-2 overflow-hidden rounded-full bg-forest-800">
								<div
									class="h-full w-[85%] rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
								></div>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-3">
							<div
								class="rounded-lg border border-white/[0.06] bg-forest-900/50 p-3 text-center"
							>
								<p class="font-mono text-lg font-semibold text-white">14</p>
								<p class="text-xs text-forest-500">Drivers</p>
							</div>
							<div
								class="rounded-lg border border-white/[0.06] bg-forest-900/50 p-3 text-center"
							>
								<p class="font-mono text-lg font-semibold text-white">87</p>
								<p class="text-xs text-forest-500">Stops</p>
							</div>
						</div>

						<div class="flex items-center gap-2 text-xs text-emerald-400">
							<CheckCircle2 class="h-4 w-4" />
							<span>23% shorter than manual routing</span>
						</div>
					</div>
				</div>

				<!-- Gradient orb -->
				<div
					class="absolute -right-32 -bottom-32 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl"
				></div>
			</div>

			<!-- Card 3: Share Routes -->
			<div
				class="group relative col-span-1 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-forest-900/80 to-forest-950 p-8 md:col-span-2"
			>
				<div class="relative z-10">
					<div
						class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20"
					>
						<Send class="h-5 w-5 text-sky-400" />
					</div>
					<h3 class="mb-2 text-xl font-semibold text-white">Share Routes</h3>
					<p class="text-sm leading-relaxed text-forest-300">
						Dispatch via SMS, email, or in-app. Drivers get turn-by-turn
						directions instantly.
					</p>

					<!-- Channel pills -->
					<div class="mt-6 flex flex-wrap gap-2">
						<span
							class="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-forest-800/50 px-3 py-1.5 text-xs text-forest-200"
						>
							<span class="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
							SMS
						</span>
						<span
							class="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-forest-800/50 px-3 py-1.5 text-xs text-forest-200"
						>
							<span class="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
							Email
						</span>
						<span
							class="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-forest-800/50 px-3 py-1.5 text-xs text-forest-200"
						>
							<span class="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
							In-app
						</span>
					</div>
				</div>

				<!-- Gradient orb -->
				<div
					class="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl"
				></div>
			</div>

			<!-- Card 4: Track & Complete -->
			<div
				class="group relative col-span-1 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-forest-900/80 to-forest-950 p-8 md:col-span-2"
			>
				<div class="relative z-10">
					<div
						class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20"
					>
						<ListChecks class="h-5 w-5 text-violet-400" weight="duotone" />
					</div>
					<h3 class="mb-2 text-xl font-semibold text-white">
						Track & Complete
					</h3>
					<p class="text-sm leading-relaxed text-forest-300">
						Monitor progress in real-time. Capture proof of delivery at every
						stop.
					</p>

					<!-- Progress visualization -->
					<div class="mt-6 space-y-2">
						<div class="flex items-center gap-3">
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20"
							>
								<CheckCircle2 class="h-3.5 w-3.5 text-emerald-400" />
							</div>
							<div class="h-0.5 flex-1 bg-emerald-500/30"></div>
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20"
							>
								<CheckCircle2 class="h-3.5 w-3.5 text-emerald-400" />
							</div>
							<div class="h-0.5 flex-1 bg-emerald-500/30"></div>
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full border border-violet-400/50 bg-violet-500/20"
							>
								<span class="h-2 w-2 rounded-full bg-violet-400"></span>
							</div>
							<div class="h-0.5 flex-1 bg-forest-700"></div>
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full border border-forest-600 bg-forest-800"
							>
								<span class="text-[10px] text-forest-500">4</span>
							</div>
						</div>
						<p class="text-right text-xs text-forest-500">
							3 of 12 stops completed
						</p>
					</div>
				</div>

				<!-- Gradient orb -->
				<div
					class="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl"
				></div>
			</div>
		</div>
	</div>
</section>
