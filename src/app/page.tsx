import { getCurrentSession } from '@/lib/db/session';
import { redirect } from 'next/navigation';

export default async function Page() {
	const { user } = await getCurrentSession();

	console.log({ user });

	if (user === null) {
		return redirect('/login');
	}

	return (
		<div>
			<h1>Hello, Next.js!</h1>
			<p>Hi, {user?.username ?? ''} :D</p>
		</div>
	);
}
