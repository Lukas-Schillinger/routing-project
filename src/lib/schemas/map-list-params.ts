import { z } from 'zod';

export const mapListParamsSchema = z.object({
	q: z.string().default(''),
	view: z.enum(['list', 'compact']).default('compact'),
	sort: z.enum(['created_at', 'title', 'stops']).default('created_at'),
	dir: z.enum(['asc', 'desc']).default('desc'),
	page: z.coerce.number().int().positive().default(1)
});

export type MapListParams = z.infer<typeof mapListParamsSchema>;
export type SortColumn = MapListParams['sort'];
