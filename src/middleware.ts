import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest): Promise<NextResponse> {
	if (request.method === 'GET') {
		return NextResponse.next();
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
