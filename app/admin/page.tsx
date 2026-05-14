// /admin → redirect to /dashboard (school admin panel)
import { redirect } from 'next/navigation';

export default function AdminPage() {
  redirect('/dashboard');
}
