<script lang="ts">
	import { browser } from '$app/environment';
	import { ShaderMount, type ShaderMountUniforms } from '@paper-design/shaders';
	import { onDestroy } from 'svelte';

	type Props = {
		fragmentShader: string;
		uniforms: ShaderMountUniforms;
		speed?: number;
		class?: string;
	};

	let { fragmentShader, uniforms, speed = 0.4, class: className = '' }: Props = $props();

	let containerEl = $state<HTMLDivElement | null>(null);
	let mount: ShaderMount | null = null;

	$effect(() => {
		if (!browser || !containerEl) return;

		mount = new ShaderMount(containerEl, fragmentShader, uniforms, undefined, speed);

		return () => {
			mount?.dispose();
			mount = null;
		};
	});

	// Update uniforms reactively
	$effect(() => {
		if (mount) mount.setUniforms(uniforms);
	});

	onDestroy(() => {
		mount?.dispose();
		mount = null;
	});
</script>

<div bind:this={containerEl} class="pointer-events-none absolute inset-0 {className}" aria-hidden="true"></div>
