import { generateState } from 'arctic';
import { github } from '@/lib/server/oauth';
import { cookies } from 'next/headers';
import { GITHUB_OAUTH_STATE } from './constant';

export async function GET(): Promise<Response> {
	const state = generateState();
	const url = github.createAuthorizationURL(state, []);

	const cookieStore = cookies();
	cookieStore.set(GITHUB_OAUTH_STATE, state, {
		path: '/',
		secure: process.env.NODE_ENV === 'production',
		httpOnly: true,
		maxAge: 60 * 10, // 1 minute
		sameSite: 'lax',
	});

	return new Response(null, {
		status: 302, // FOUND - https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/302
		headers: {
			Location: url.toString(),
		},
	});
}
