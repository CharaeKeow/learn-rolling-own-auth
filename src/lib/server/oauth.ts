import { GitHub } from 'arctic';

// TODO: Rework this so that the host is dynamic, depending on environment
const GITHUB_REDIRECT_URL = 'http://localhost:3000/login/github/callback';

export const github = new GitHub(
	process.env.GITHUB_CLIENT_ID ?? '',
	process.env.GITHUB_CLIENT_SECRET ?? '',
	// GITHUB_REDIRECT_URL,
	null,
);
