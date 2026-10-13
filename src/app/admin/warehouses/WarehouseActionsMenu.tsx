'use client';

import React, { useState } from 'react';
import { MoreVertical, Edit, Power, PowerOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toggleWarehouseStatus } from '@/actions/warehouses';

export function WarehouseActionsMenu({ warehouse }: { warehouse: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleToggleStatus = async () => {
    if (confirm(`هل أنت متأكد من ${warehouse.isActive ? 'تعطيل' : 'تفعيل'} هذا المستودع؟`)) {
      setIsLoading(true);
      const res = await toggleWarehouseStatus(warehouse.id, !warehouse.isActive);
      setIsLoading(false);
      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error);
      }
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-zinc-100 overflow-hidden">
            <div className="py-1">
              <button
                onClick={() => {
                  router.push(`/admin/warehouses/${warehouse.id}`);
                  setIsOpen(false);
                }}
                className="flex w-full items-center px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <Edit className="w-4 h-4 ml-2" />
                تعديل
              </button>
              
              <button
                onClick={handleToggleStatus}
                disabled={isLoading}
                className={`flex w-full items-center px-4 py-2 text-sm hover:bg-zinc-50 ${warehouse.isActive ? 'text-amber-600' : 'text-emerald-600'}`}
              >
                {warehouse.isActive ? (
                  <>
                    <PowerOff className="w-4 h-4 ml-2" />
                    تعطيل
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4 ml-2" />
                    تفعيل
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
