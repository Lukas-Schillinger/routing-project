import type {
	CreateMagicInvite,
	CreateMagicLogin,
	MagicInvite,
	MagicLink,
	MagicLogin
} from '$lib/schemas';
import { db } from '$lib/server/db';
import { magicLinks, organizations, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export class MagicLinkService {
	async getMagicLinks(organization_id: string): Promise<MagicLink[]> {
		return db.select().from(magicLinks).where(eq(organizations.id, organization_id));
	}

	async createMagicInvite(
		magicInviteData: CreateMagicInvite,
		organization_id: string
	): Promise<MagicInvite> {
		const [newMagicInvite] = await db
			.insert(magicLinks)
			.values({
				organization_id: organization_id,
				...magicInviteData
			})
			.returning();

		return newMagicInvite as MagicInvite;
	}

	async createMagicLogin(magicLoginData: CreateMagicLogin): Promise<MagicLogin> {
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.id, magicLoginData.user_id))
			.limit(1);

		const [magicLogin] = await db
			.insert(magicLinks)
			.values({
				organization_id: user.organization_id,
				...magicLoginData
			})
			.returning();

		return magicLogin as MagicLogin;
	}

	// use invite link
	// -- create user

	// use login link
	// -- create session
}

export const magicLinkService = new MagicLinkService();
