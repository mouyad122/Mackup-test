import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

export default async function SkincarePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const category = await prisma.category.findUnique({ where: { slug: 'skincare' } });
  
  if (category) {
    redirect(`/${locale}/shop?category=${category.id}`);
  }
  redirect(`/${locale}/shop`);
}
