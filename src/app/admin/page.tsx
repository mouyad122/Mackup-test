import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
const AdminIndexPage = async () => {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/admin/login');
  }

  // If the employee is a cashier, they shouldn't see the dashboard.
  // Redirect them directly to the POS cashier screen.
  if (session.employee.role.name === 'Cashier' || session.employee.role.name === 'كاشير') {
    redirect('/pos/cashier');
  }

  // Otherwise, default to the admin dashboard
  redirect('/admin/dashboard');
};

export default AdminIndexPage;
