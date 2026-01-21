// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Error {
			code: string;
			message: string;
		}
		interface Locals {
			user: import('$lib/services/server/auth').SessionValidationResult['user'];
			session: import('$lib/services/server/auth').SessionValidationResult['session'];
			permissions: import('$lib/services/server/permissions').Permission[];
			features: import('$lib/server/db/schema').PlanFeatures | null;
			requestId: string;
			log: import('pino').Logger;
		}
	}
}

export {};
