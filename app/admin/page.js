import { cookies } from 'next/headers';
import { sessionUser } from '../../lib/security.mjs';
import AdminPanel from '../../components/AdminPanel';
export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  const username = sessionUser((await cookies()).get('still_session')?.value);
  return <AdminPanel initialUser={username} />;
}
