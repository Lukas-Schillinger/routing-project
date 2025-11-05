import { mailgunClient } from '$lib/services/external/mail';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const data = '1, 2, 3';
	return { data };
};

export const actions: Actions = {
	sendMail: async (event) => {
		console.log('HELLO');
		const formData = await event.request.formData();
		const toEmail = formData.get('email') ? formData.get('email') : 'lukas@schillingertools.com';
		const content = formData.get('content') ? formData.get('content') : 'placeholder content';

		await mailgunClient.sendMagicInviteEmail('lukas@schillingertools.com', 'https://google.com');

		return 'success';
	}
};
