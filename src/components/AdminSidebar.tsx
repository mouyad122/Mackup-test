'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { logout } from '@/actions/auth';
import Image from 'next/image';
import { AdminNotificationsDropdown } from './AdminNotificationsDropdown';

interface AdminSidebarProps {
  employeeName: string;
  roleName?: string;
}

export function AdminSidebar({ employeeName, roleName = 'ADMIN' }: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

    const allLinks = [
      { href: '/admin/dashboard', label: 'لوحة التحكم', permission: null },
      { href: '/admin/products', label: 'المنتجات والأسعار', permission: 'manage:products' },
      { href: '/admin/categories', label: 'المجموعات', permission: 'manage:products' },
      { href: '/admin/orders', label: 'طلبات المتجر', permission: 'manage:orders' },
      { href: '/admin/settings', label: 'طلبيات شركة التوصيل', permission: 'manage:orders' },
      { href: '/admin/reports', label: 'تقارير الأعمال', permission: 'manage:settings' },
      { href: '/admin/suppliers', label: 'الموردون', permission: 'manage:settings' },
      { href: '/admin/reconciliation', label: 'الجرد والتسويات', permission: 'manage:settings' },
      { href: '/admin/captains', label: 'الكباتن والمندوبون', permission: 'manage:orders' },
      { href: '/admin/deliveries', label: 'إدارة التوصيلات', permission: 'manage:settings' },
      { href: '/admin/rewards', label: 'مكافآت العملاء', permission: 'manage:settings' },
      { href: '/admin/employees', label: 'الموظفين والصلاحيات', permission: 'manage:settings' },
      { href: '/admin/content', label: 'المحتوى والمدونة (CMS)', permission: 'manage:settings' },
      { href: '/admin/logs', label: 'سجلات النظام', permission: 'manage:settings' }
    ];

  const normalizedRole = roleName.trim().toUpperCase().replace(/[_-]+/g, ' ');
  const roleAccess: Record<string, string[]> = {
    'أدمن تشغيلي': ['manage:orders'],
    'ادمن تشغيلي': ['manage:orders'],
    'STORE MANAGER': ['manage:products', 'manage:orders'],
    'INVENTORY MANAGER': ['manage:products', 'manage:inventory'],
    'FINANCE MANAGER': ['manage:settings'],
    'DELIVERY MANAGER': ['manage:orders', 'manage:settings'],
    'CONTENT MANAGER': ['manage:products', 'manage:settings'],
  };
  const filteredLinks = ['ADMIN', 'SUPER ADMIN', 'أدمن رئيسي', 'ادمن رئيسي'].includes(normalizedRole)
    ? allLinks
    : allLinks.filter(link => !link.permission || (roleAccess[normalizedRole] || []).includes(link.permission));

  return (
    <>
      {/* Mobile Top Header containing Hamburger Toggle */}
      <div className="md:hidden flex items-center justify-between bg-[#3F4B32] text-white px-4 py-3 sticky top-0 z-40 w-full shadow-md border-b border-[#B7935F]">
        <span className="font-heading font-bold text-lg text-[#B7935F]">
          رَواق
        </span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-zinc-100 focus:outline-none hover:text-[#B7935F]"
          aria-label="Toggle Menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Backdrop for mobile view */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content container */}
      <aside
        className={`fixed md:sticky top-0 right-0 z-30 bg-[#3F4B32] text-white flex flex-col h-screen font-sans border-l-4 border-[#B7935F] transition-all duration-300 transform md:transform-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-16' : 'md:w-64'} w-64`}
        dir="rtl"
      >
        {/* Desktop Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -left-4 top-6 bg-[#B7935F] text-white p-1 rounded-full shadow-md hover:bg-[#a68250] transition-colors z-50"
          title={isCollapsed ? "توسيع" : "طي"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isCollapsed ? (
              <path d="m15 18-6-6 6-6"/>
            ) : (
              <path d="m9 18 6-6-6-6"/>
            )}
          </svg>
        </button>
        {/* Brand Header */}
        <div className={`p-6 border-b border-[#2d3623] flex flex-col items-center transition-all relative ${isCollapsed ? 'md:p-3 md:pb-4' : ''}`}>
          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden absolute top-4 left-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-[#2d3623] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>

          <div className={`flex items-center justify-center mb-3 ${isCollapsed ? 'md:w-10 md:h-10 md:mb-0' : 'w-24 h-24'}`}>
            <img src="/brand/logo_rawaq.png" alt="Rawaq Logo" className="object-contain w-full h-full drop-shadow-md filter invert" />
          </div>
          {!isCollapsed && (
            <>
              <span className="font-heading font-bold text-2xl tracking-widest text-[#B7935F] mb-1">
                رَواق
              </span>
              <span className="text-xs text-zinc-400">لوحة الإدارة والتحكم</span>
            </>
          )}
        </div>

        {/* Employee Welcome & Log Out */}
        <div className={`p-4 border-b border-[#2d3623] text-xs text-zinc-300 flex ${isCollapsed ? 'md:flex-col md:gap-2' : 'justify-between items-center'}`}>
          {!isCollapsed && <span className="truncate max-w-[120px]">مرحباً، {employeeName}</span>}
          <div className={`flex items-center ${isCollapsed ? 'flex-col gap-3' : 'gap-3'}`}>
            <AdminNotificationsDropdown />
            <form action={logout}>
              <button
                type="submit"
                className="text-[#B7935F] hover:text-white underline font-bold"
                title="تسجيل الخروج"
              >
                {isCollapsed ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                ) : 'خروج'}
              </button>
            </form>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 overflow-x-hidden">
          {filteredLinks.map((link) => {
            // Very simple deterministic icon generation based on first letter or specific keywords
            let iconPath = <circle cx="12" cy="12" r="3" />; // fallback
            if (link.href.includes('dashboard')) iconPath = <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />;
            else if (link.href.includes('products')) iconPath = <path d="M20.9 9.3l-8.6-8.6c-.4-.4-1-.6-1.5-.6H4c-1.1 0-2 .9-2 2v6.8c0 .5.2 1.1.6 1.5l8.6 8.6c.8.8 2.1.8 2.9 0l6.8-6.8c.8-.8.8-2.1 0-2.9z" />;
            else if (link.href.includes('categories')) iconPath = <path d="M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z" />;
            else if (link.href.includes('orders')) iconPath = <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />;
            else if (link.href.includes('sales')) iconPath = <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />;
            else if (link.href.includes('inventory')) iconPath = <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />;
            else if (link.href.includes('employees')) iconPath = <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />;
            else if (link.href.includes('shipping')) iconPath = <path d="M5 18H3c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h3 M5 18a2 2 0 0 0 4 0 M9 18h6 M15 18a2 2 0 0 0 4 0 M19 18h2c1.1 0 2-.9 2-2v-4l-3-4h-5v10z M14 6h5l3 4v2h-8V6z" />;
            else if (link.href.includes('content')) iconPath = <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />;
            else if (link.href.includes('audit-logs')) iconPath = <path d="M2 12h4l2-9 5 18 3-9h6" />;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded hover:bg-[#2d3623] text-sm font-medium transition-colors text-zinc-200 hover:text-white ${isCollapsed ? 'md:justify-center md:px-2' : ''}`}
                title={link.label}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  {iconPath}
                </svg>
                {!isCollapsed && <span>{link.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
