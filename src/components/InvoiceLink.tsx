"use client";

import React from 'react';

interface InvoiceLinkProps {
  orderId: string;
}

export default function InvoiceLink({ orderId }: InvoiceLinkProps) {
  const invoiceUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/ar/invoice/${orderId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(invoiceUrl);
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <a
        href={invoiceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--color-champagne-600)] underline"
      >
        {invoiceUrl}
      </a>
      <button
        type="button"
        onClick={copyToClipboard}
        className="p-1 rounded bg-[var(--color-charcoal-900)] hover:bg-[var(--color-charcoal-800)] text-white"
        title="Copy invoice link"
      >
        نسخ
      </button>
    </div>
  );
}
