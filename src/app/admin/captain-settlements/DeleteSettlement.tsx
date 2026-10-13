'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { deleteCaptainSettlement } from '@/actions/operations';

export function DeleteSettlement({ id }: { id: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (confirm('هل أنت متأكد من حذف هذه التسوية والتراجع عنها؟')) {
      await deleteCaptainSettlement(id);
      router.refresh();
    }
  };

  return (
    <button onClick={handleDelete} className="text-red-600 hover:text-red-800 font-bold text-xs">
      حذف
    </button>
  );
}
