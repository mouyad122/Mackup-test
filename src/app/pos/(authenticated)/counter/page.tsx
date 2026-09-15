import { redirect } from 'next/navigation';

export default async function POSPage() {
  redirect('/pos/cashier');
}
