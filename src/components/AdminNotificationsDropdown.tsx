'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getUnreadNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/actions/notifications';
import { Bell } from 'lucide-react';

export function AdminNotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    const res = await getUnreadNotifications();
    if (res.success && res.notifications) {
      setNotifications(res.notifications);
      setUnreadCount(res.notifications.length);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(() => void fetchNotifications(), 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications([]);
    setUnreadCount(0);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-300 hover:text-white hover:bg-[var(--color-charcoal-800)] rounded-full transition-colors"
        title="الإشعارات"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-[var(--color-charcoal-900)] border border-[var(--color-charcoal-800)] rounded-md shadow-lg overflow-hidden z-50" dir="rtl">
          <div className="flex justify-between items-center px-4 py-3 border-b border-[var(--color-charcoal-800)] bg-[var(--color-charcoal-950)] text-white">
            <h3 className="text-sm font-bold">الإشعارات</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs text-[var(--color-champagne-400)] hover:underline"
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                لا توجد إشعارات جديدة
              </div>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} className="p-4 border-b border-gray-100 dark:border-[var(--color-charcoal-800)] hover:bg-gray-50 dark:hover:bg-[var(--color-charcoal-800)] transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${notif.type === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                      {notif.title}
                    </span>
                    <button 
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      مقروء
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{notif.message}</p>
                  {notif.link && (
                    <Link 
                      href={notif.link}
                      className="text-xs text-[var(--color-champagne-500)] hover:underline mt-2 inline-block"
                      onClick={() => setIsOpen(false)}
                    >
                      عرض التفاصيل
                    </Link>
                  )}
                  <div className="text-[10px] text-gray-400 mt-2">
                    {new Date(notif.createdAt).toLocaleString('ar-JO')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
