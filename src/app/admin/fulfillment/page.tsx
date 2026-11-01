import { redirect } from 'next/navigation';

export default async function FulfillmentRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  q.set('tab', 'PREPARING');
  redirect(`/admin/orders?${q.toString()}`);
}
