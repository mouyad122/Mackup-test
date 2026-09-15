import { redirect } from 'next/navigation';

export default function POSRootRedirect() {
  redirect('/pos/cashier');
}
