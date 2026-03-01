<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	export const fileUploadVariants = tv({
		base: 'group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
		variants: {
			variant: {
				idle: 'border-muted-foreground/25 bg-transparent hover:border-primary/40 hover:bg-primary/[0.02]',
				hover: 'border-primary/40 bg-primary/[0.02] scale-[1.005]',
				dragging: 'border-primary bg-primary/5 scale-[1.01] animate-pulse-border',
				success: 'border-primary/50 bg-primary/5',
				error: 'border-destructive/50 bg-destructive/5'
			},
			size: {
				default: 'h-[240px]',
				sm: 'h-[180px] p-6',
				lg: 'h-[280px] p-12'
			}
		},
		defaultVariants: {
			variant: 'idle',
			size: 'default'
		}
	});

	export type FileUploadVariant = VariantProps<typeof fileUploadVariants>['variant'];
	export type FileUploadSize = VariantProps<typeof fileUploadVariants>['size'];

	export type FileUploadProps = {
		accept?: string;
		multiple?: boolean;
		disabled?: boolean;
		maxSize?: number;
		onFileSelect?: (files: File[]) => void;
		onError?: (error: string) => void;
		class?: string;
		size?: FileUploadSize;
		hint?: string;
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { AlertCircle, CheckCircle2, FileText, Upload, X } from 'lucide-svelte';
	import { backOut, cubicOut } from 'svelte/easing';
	import { fade, fly, scale } from 'svelte/transition';

	let {
		accept = '*',
		multiple = false,
		disabled = false,
		maxSize,
		onFileSelect,
		onError,
		class: className,
		size = 'default',
		hint
	}: FileUploadProps = $props();

	let currentVariant: FileUploadVariant = $state('idle');
	let selectedFiles: File[] = $state([]);
	let errorMessage: string | null = $state(null);
	let fileInput: HTMLInputElement;
	let dragCounter = $state(0);

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	function validateFiles(files: File[]): { valid: File[]; error: string | null } {
		if (maxSize) {
			const oversized = files.filter((f) => f.size > maxSize);
			if (oversized.length > 0) {
				return {
					valid: [],
					error: `File too large. Maximum size is ${formatFileSize(maxSize)}`
				};
			}
		}
		return { valid: files, error: null };
	}

	function handleFiles(files: FileList | null) {
		if (!files || files.length === 0) return;

		const fileArray = Array.from(files);
		const { valid, error } = validateFiles(fileArray);

		if (error) {
			errorMessage = error;
			currentVariant = 'error';
			onError?.(error);
			return;
		}

		selectedFiles = multiple ? valid : [valid[0]];
		currentVariant = 'success';
		errorMessage = null;
		onFileSelect?.(selectedFiles);
	}

	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		if (disabled) return;
		dragCounter++;
		currentVariant = 'dragging';
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		dragCounter--;
		if (dragCounter === 0) {
			currentVariant = 'idle';
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		if (disabled) return;
		dragCounter = 0;
		currentVariant = 'idle';
		handleFiles(e.dataTransfer?.files || null);
	}

	function handleClick() {
		if (disabled) return;
		fileInput?.click();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (disabled) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			fileInput?.click();
		}
	}

	function handleMouseEnter() {
		if (disabled || currentVariant === 'success' || currentVariant === 'error') return;
		currentVariant = 'hover';
	}

	function handleMouseLeave() {
		if (currentVariant === 'hover') {
			currentVariant = 'idle';
		}
	}

	function clearSelection() {
		selectedFiles = [];
		currentVariant = 'idle';
		errorMessage = null;
		if (fileInput) fileInput.value = '';
	}

	function dismissError() {
		errorMessage = null;
		currentVariant = 'idle';
	}

	const acceptHint = $derived.by(() => {
		if (hint) return hint;
		if (accept === '*') return 'Any file type';
		return accept
			.split(',')
			.map((a) => a.trim().replace('.', '').toUpperCase())
			.join(', ');
	});
</script>

<div
	role="button"
	tabindex={disabled ? -1 : 0}
	class={cn(
		fileUploadVariants({ variant: currentVariant, size }),
		disabled && 'pointer-events-none opacity-50',
		className
	)}
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
	onclick={handleClick}
	onkeydown={handleKeydown}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
>
	<!-- Hidden file input -->
	<input
		bind:this={fileInput}
		type="file"
		{accept}
		{multiple}
		class="hidden"
		onchange={(e) => handleFiles(e.currentTarget.files)}
	/>

	<!-- Idle / Hover / Dragging State -->
	{#if currentVariant === 'idle' || currentVariant === 'hover' || currentVariant === 'dragging'}
		<div class="flex flex-col items-center gap-4" in:fade={{ duration: 200 }}>
			<!-- Icon -->
			<div
				class="relative transition-transform duration-300
					{currentVariant === 'hover' ? 'scale-110' : ''}
					{currentVariant === 'dragging' ? 'float-animation scale-115' : ''}"
			>
				<div
					class="flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300
						{currentVariant === 'dragging' ? 'bg-primary/15' : 'bg-muted/50 group-hover:bg-primary/10'}"
				>
					{#if currentVariant === 'dragging'}
						<span in:scale={{ duration: 200, easing: backOut }}>
							<Upload class="h-7 w-7 text-primary transition-colors" />
						</span>
					{:else}
						<FileText
							class="h-7 w-7 text-muted-foreground transition-colors group-hover:text-primary/70"
						/>
					{/if}
				</div>
			</div>

			<!-- Text -->
			<div class="space-y-1.5">
				{#if currentVariant === 'dragging'}
					<p
						class="text-base font-medium text-primary"
						in:fly={{ y: 5, duration: 200, easing: cubicOut }}
					>
						Drop to upload
					</p>
				{:else}
					<p class="text-base font-medium text-foreground">Drop your file here</p>
					<p class="text-sm text-muted-foreground">
						or <span class="text-primary underline-offset-2 group-hover:underline">browse</span> to choose
					</p>
				{/if}
			</div>

			<!-- Hint -->
			<p class="text-xs text-muted-foreground/70">
				{acceptHint}
			</p>
		</div>
	{/if}

	<!-- Success State -->
	{#if currentVariant === 'success' && selectedFiles.length > 0}
		<div
			class="flex flex-col items-center gap-4"
			in:scale={{ duration: 300, easing: backOut, start: 0.9 }}
		>
			<!-- Success Icon -->
			<div class="relative">
				<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
					<CheckCircle2 class="check-icon h-7 w-7 text-primary" />
				</div>
			</div>

			<!-- File Info -->
			<div class="space-y-1 text-center">
				<p class="max-w-[200px] truncate text-sm font-medium text-foreground">
					{selectedFiles[0].name}
				</p>
				<p class="text-xs text-muted-foreground">
					{formatFileSize(selectedFiles[0].size)}
					{#if selectedFiles.length > 1}
						<span class="mx-1">·</span>
						+{selectedFiles.length - 1} more
					{/if}
				</p>
			</div>

			<!-- Change file hint -->
			<p class="text-xs text-muted-foreground/70">Click to change</p>

			<!-- Clear button -->
			<button
				type="button"
				class="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
				onclick={(e) => {
					e.stopPropagation();
					clearSelection();
				}}
			>
				<X class="h-4 w-4" />
			</button>
		</div>
	{/if}

	<!-- Error State -->
	{#if currentVariant === 'error'}
		<div
			class="flex flex-col items-center gap-4"
			in:scale={{ duration: 300, easing: backOut, start: 0.9 }}
		>
			<!-- Error Icon -->
			<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/15">
				<AlertCircle class="h-7 w-7 text-destructive" />
			</div>

			<!-- Error Message -->
			<div class="space-y-1 text-center">
				<p class="text-sm font-medium text-destructive">
					{errorMessage}
				</p>
				<p class="text-xs text-muted-foreground">Click to try again</p>
			</div>

			<!-- Dismiss button -->
			<button
				type="button"
				class="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
				onclick={(e) => {
					e.stopPropagation();
					dismissError();
				}}
			>
				<X class="h-4 w-4" />
			</button>
		</div>
	{/if}
</div>

<style>
	@keyframes pulse-border {
		0%,
		100% {
			border-color: hsl(var(--primary));
		}
		50% {
			border-color: hsl(var(--primary) / 0.4);
		}
	}

	.animate-pulse-border {
		animation: pulse-border 1.5s ease-in-out infinite;
	}

	@keyframes draw-check {
		from {
			stroke-dashoffset: 24;
		}
		to {
			stroke-dashoffset: 0;
		}
	}

	.check-icon :global(polyline) {
		stroke-dasharray: 24;
		stroke-dashoffset: 24;
		animation: draw-check 0.4s ease-out 0.1s forwards;
	}

	@keyframes float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-4px);
		}
	}

	.float-animation {
		animation: float 2s ease-in-out infinite;
	}
</style>
