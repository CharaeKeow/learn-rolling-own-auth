import { cookies } from 'next/headers';
import { OAuth2Tokens } from 'arctic';
import { github } from '@/lib/server/oauth';
import { GITHUB_API_USER_ENDPOINT, GITHUB_OAUTH_STATE } from '../constant';
import { createUser, getUserFromGithubId } from '@/lib/db/user';
import {
	createSession,
	generateSessionToken,
	setSessionTokenCookie,
} from '@/lib/db/session';

export async function GET(request: Request): Promise<Response> {
	const url = new URL(request.url);
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const cookieStore = cookies();
	const storedState = cookieStore.get(GITHUB_OAUTH_STATE)?.value ?? null;

	if (code === null || state === null || storedState === null) {
		return new Response(null, {
			status: 400,
		});
	}

	if (state !== storedState) {
		return new Response(null, {
			status: 400,
		});
	}

	let tokens: OAuth2Tokens;

	try {
		tokens = await github.validateAuthorizationCode(code);
	} catch (error) {
		// Invalid code or client credentials
		return new Response(null, {
			status: 400,
		});
	}

	const githubUserResponse = await fetch(GITHUB_API_USER_ENDPOINT, {
		headers: {
			Authorization: `Bearer ${tokens.accessToken()}`,
		},
	});

	// Maybe can add type to `githubUser`? Currently it's `any`
	const githubUser = await githubUserResponse.json();
	const githubUserId = githubUser.id;
	const githubUsername = githubUser.login;

	const existingUser = await getUserFromGithubId(githubUserId);

	console.log({ existingUser });

	if (existingUser !== null) {
		const sesionToken = generateSessionToken();
		const session = await createSession(sesionToken, existingUser.id);

		await setSessionTokenCookie(sesionToken, session.expiresAt);

		return new Response(null, {
			status: 302,
			headers: {
				Location: '/',
			},
		});
	}

	const user = await createUser(githubUserId, githubUsername);
	const sessionToken = generateSessionToken();
	const session = await createSession(sessionToken, user.id);

	await setSessionTokenCookie(sessionToken, session.expiresAt);

	return new Response(null, {
		status: 302,
		headers: {
			Location: '/',
		},
	});
}
