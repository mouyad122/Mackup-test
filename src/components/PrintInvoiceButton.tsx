'use client';

import React from 'react';

interface PrintInvoiceButtonProps {
  className?: string;
  label?: string;
}

export function PrintInvoiceButton({ 
  className = "bg-[#3F4832] hover:bg-[#2d3623] text-white font-bold py-2 px-8 rounded transition-colors shadow-md",
  label = "طباعة الفاتورة"
}: PrintInvoiceButtonProps) {
  return (
    <button 
      onClick={() => window.print()}
      className={className}
    >
      {label}
    </button>
  );
}
