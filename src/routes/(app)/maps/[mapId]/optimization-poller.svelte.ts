import { captureClientError } from '$lib/errors';
import { mapApi } from '$lib/services/api';
import type { OptimizationJob } from '$lib/schemas/map';
import { SvelteDate } from 'svelte/reactivity';

const BASE_INTERVAL = 2000;
const MAX_INTERVAL = 30_000;
const MAX_CONSECUTIVE_ERRORS = 5;
const MIN_TIMEOUT = 30_000;
const MS_PER_STOP = 2000;

type PollerCallbacks = {
	onComplete: () => Promise<void>;
	onCancelled: () => Promise<void>;
};

function getTimeoutMs(stopCount: number): number {
	return Math.max(MIN_TIMEOUT, stopCount * MS_PER_STOP);
}

export function createOptimizationPoller(
	mapId: string,
	stopCount: number,
	callbacks: PollerCallbacks
) {
	let isOptimizing = $state(false);
	let error = $state<string | null>(null);
	let startTime = $state<Date | null>(null);

	let pollTimeout: ReturnType<typeof setTimeout> | null = null;
	let consecutiveErrors = 0;
	let currentInterval = BASE_INTERVAL;

	function clearPollTimeout() {
		if (pollTimeout) {
			clearTimeout(pollTimeout);
			pollTimeout = null;
		}
	}

	function schedulePoll() {
		pollTimeout = setTimeout(poll, currentInterval);
	}

	function start(fromTime?: Date) {
		if (pollTimeout) return;
		isOptimizing = true;
		error = null;
		startTime = fromTime ?? new SvelteDate();
		consecutiveErrors = 0;
		currentInterval = BASE_INTERVAL;
		schedulePoll();
	}

	function stop() {
		clearPollTimeout();
		isOptimizing = false;
		consecutiveErrors = 0;
		currentInterval = BASE_INTERVAL;
	}

	function destroy() {
		clearPollTimeout();
	}

	async function handleJobStatus(job: OptimizationJob | null) {
		if (!job || job.status === 'completed') {
			stop();
			await callbacks.onComplete();
		} else if (job.status === 'failed') {
			stop();
			error = job.error_message || 'Optimization failed';
		} else if (job.status === 'cancelled') {
			stop();
			await callbacks.onCancelled();
		} else {
			schedulePoll();
		}
	}

	async function poll() {
		pollTimeout = null;

		const elapsed = Date.now() - (startTime?.getTime() ?? Date.now());
		if (elapsed >= getTimeoutMs(stopCount)) {
			stop();
			error = 'Optimization timed out. Please try again.';
			return;
		}

		try {
			const job = await mapApi.getOptimizationStatus(mapId);
			consecutiveErrors = 0;
			currentInterval = BASE_INTERVAL;
			await handleJobStatus(job);
		} catch (err) {
			console.error('Error polling optimization status:', err);
			captureClientError(err);
			consecutiveErrors++;

			if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
				stop();
				error =
					'Lost connection while checking optimization status. Please refresh the page.';
				return;
			}

			currentInterval = Math.min(currentInterval * 2, MAX_INTERVAL);
			schedulePoll();
		}
	}

	return {
		get isOptimizing() {
			return isOptimizing;
		},
		get error() {
			return error;
		},
		get startTime() {
			return startTime ?? new SvelteDate();
		},
		start,
		stop,
		destroy
	};
}
