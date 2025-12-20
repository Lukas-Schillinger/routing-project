// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: import('$lib/services/server/auth').SessionValidationResult['user'];
			session: import('$lib/services/server/auth').SessionValidationResult['session'];
			permissions: import('$lib/services/server/permissions').Permission[];
		}
	} // interface Error {}
	// interface Locals {}
} // interface PageData {}
// interface PageState {}

// interface Platform {}
export {};
