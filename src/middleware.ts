import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';
import {
	SESSION_COOKIE_NAME,
	THIRTY_DAYS_IN_MILLISECONDS,
} from './lib/db/session';

export async function middleware(request: NextRequest): Promise<NextResponse> {
	if (request.method === 'GET') {
		const response = NextResponse.next();
		const token = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;

		if (token !== null) {
			// Only extend cookie expiration on GET requests since we can be sure
			// a new session wasn't set when handling the request.
			// This is a limitation of Next middleware - i.e. it can't detect if a new
			// cookie was set inside server actions or route handlers. Hence only extend
			// cookie expiration in `GET` request for safety
			response.cookies.set(SESSION_COOKIE_NAME, token, {
				path: '/',
				maxAge: THIRTY_DAYS_IN_MILLISECONDS / 1000, // because the cookies maxAge is in seconds'
				sameSite: 'lax',
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
			});
		}

		return response;
	}

	const originHeader = request.headers.get('Origin');
	// NOTE: You may need to use `X-Forwarded-Host` instead -> Not sure what is this, more research needed
	const hostHeader = request.headers.get('Host');

	if (originHeader === null || hostHeader === null) {
		return new NextResponse(null, {
			status: 403, // Forbidden
		});
	}

	let origin: URL;

	try {
		origin = new URL(originHeader);
	} catch {
		return new NextResponse(null, {
			status: 403,
		});
	}

	if (origin.host !== hostHeader) {
		return new NextResponse(null, {
			status: 403,
		});
	}

	return NextResponse.next();
}
