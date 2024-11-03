import { eq } from 'drizzle-orm';
import db from '.';
import { User, userTable } from './schema';

export async function getUserFromGithubId(
	githubId: number,
): Promise<User | null> {
	const result = await db
		.select({ user: userTable })
		.from(userTable)
		.where(eq(userTable.githubId, githubId));

	if (result.length < 1) {
		return null;
	}

	const { user } = result[0];
	return user;
}

export async function createUser(
	githubId: number,
	githubUsername: string,
): Promise<User> {
	const result = await db
		.insert(userTable)
		.values({
			githubId,
			username: githubUsername,
		})
		.returning();

	if (result.length < 1) {
		throw new Error('Unexpected error');
	}

	const user = result[0];
	return user;
}
