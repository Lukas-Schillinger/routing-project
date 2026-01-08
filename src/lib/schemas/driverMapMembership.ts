import { z } from 'zod';

export const driverMapMembershipSchema = z.object({
	id: z.string().uuid(),
	organization_id: z.string().uuid(),
	driver_id: z.string().uuid(),
	map_id: z.string().uuid(),
	created_at: z.date(),
	updated_at: z.date()
});

export const createDriverMapMembershipSchema = z.object({
	driver_id: z.string().uuid(),
	map_id: z.string().uuid()
});

export const driverMapMembershipWithRelationsSchema =
	driverMapMembershipSchema.extend({
		driver: z
			.object({
				id: z.string().uuid(),
				name: z.string(),
				phone: z.string().nullable(),
				notes: z.string().nullable(),
				active: z.boolean(),
				temporary: z.boolean()
			})
			.optional(),
		map: z
			.object({
				id: z.string().uuid(),
				title: z.string()
			})
			.optional()
	});

export type DriverMapMembership = z.infer<typeof driverMapMembershipSchema>;
export type CreateDriverMapMembership = z.infer<
	typeof createDriverMapMembershipSchema
>;
export type DriverMapMembershipWithRelations = z.infer<
	typeof driverMapMembershipWithRelationsSchema
>;
