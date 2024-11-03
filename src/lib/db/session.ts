// REFERENCE: https://lucia-auth.com/sessions/basic-api/drizzle-orm

import {
	encodeBase32LowerCaseNoPadding,
	encodeHexLowerCase,
} from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';

import { type User, type Session, sessionTable, userTable } from './schema';
import db from '.';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export type SessionValidationResult =
	| { session: Session; user: User }
	| { session: null; user: null };

export const SESSION_COOKIE_NAME = 'session';
export const THIRTY_DAYS_IN_MILLISECONDS = 1000 * 60 * 60 * 24 * 30;

export function generateSessionToken(): string {
	// Create a Uint8Array with 20 bytes, each element/byte initialized to 0.
	// Uint8Array stores 8-bit unsigned integers (0-255) in each element
	const bytes = new Uint8Array(20);

	// Fills each element in the Uint8Array with crytographically secure random values
	crypto.getRandomValues(bytes);

	const token = encodeBase32LowerCaseNoPadding(bytes);
	return token;
}

export async function createSession(
	token: string,
	userId: number,
): Promise<Session> {
	// Hash the token using SHA-256, then encode the result as a lowercase hexadecimal string
	// The token is first converted to a byte array using TextEncoder
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

	const session: Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + THIRTY_DAYS_IN_MILLISECONDS), // expires in 30 days
	};

	await db.insert(sessionTable).values(session);

	return session;
}

/**
 * Sessions are validated in 2 steps:
 * 1. Does the session exist in the DB?
 * 2. Is it still within expiration?
 *
 * Here the session expiration is extended when it's closed to expiration, to ensure
 * active sessions are persisted (while inactive ones will eventually expire). This
 * is done by checking if the session is less than than 15 days (i.e. half of expiration date) before expiration
 */
export async function validateSessionToken(
	token: string,
): Promise<SessionValidationResult> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

	const result = await db
		.select({ user: userTable, session: sessionTable })
		.from(sessionTable)
		.innerJoin(userTable, eq(sessionTable.userId, userTable.id))
		.where(eq(sessionTable.id, sessionId));

	if (result.length < 1) {
		return { session: null, user: null };
	}

	const { user, session } = result[0];

	// Delete session if already expired
	if (Date.now() >= session.expiresAt.getTime()) {
		await db.delete(sessionTable).where(eq(sessionTable.id, session.id));
		return { session: null, user: null };
	}

	// Extend the session if it's half of the expiration date (15 days)
	if (
		Date.now() >=
		session.expiresAt.getTime() - THIRTY_DAYS_IN_MILLISECONDS / 2
	) {
		session.expiresAt = new Date(Date.now() + THIRTY_DAYS_IN_MILLISECONDS);

		await db
			.update(sessionTable)
			.set({ expiresAt: session.expiresAt })
			.where(eq(sessionTable.id, session.id));
	}

	return { user, session };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
}

export async function setSessionTokenCookie(
	token: string,
	expiresAt: Date,
): Promise<void> {
	const cookieStore = cookies();

	cookieStore.set(SESSION_COOKIE_NAME, token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		expires: expiresAt,
		path: '/',
	});
}

export async function deleteSessionTokenCookie(): Promise<void> {
	const cookieStore = cookies();

	cookieStore.set(SESSION_COOKIE_NAME, '', {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 0,
		path: '/',
	});
}
