import { redirect } from 'next/navigation';

/** Redirect legacy /influencer-search URL to /brand/search inside the brand shell. */
export default function InfluencerSearchRedirect() {
  redirect('/brand/search');
}
