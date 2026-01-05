import { writable } from 'svelte/store';

export type PendingImportData = {
	fileName: string;
	headers: string[];
	rows: Record<string, string>[];
};

/**
 * Store for passing CSV data from map detail page to import page.
 * Data is consumed (cleared) when read by the import page.
 */
function createPendingImportStore() {
	const { subscribe, set } = writable<PendingImportData | null>(null);

	return {
		subscribe,
		set,
		/** Consume and clear the pending data */
		consume: (): PendingImportData | null => {
			let data: PendingImportData | null = null;
			subscribe((value) => {
				data = value;
			})();
			set(null);
			return data;
		}
	};
}

export const pendingImport = createPendingImportStore();
