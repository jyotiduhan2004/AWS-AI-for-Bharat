import { redirect } from 'next/navigation';

/**
 * Redirect old /messages URL to the dashboard-integrated /dashboard/messages page.
 */
export default function MessagesRedirectPage() {
  redirect('/dashboard/messages');
}
