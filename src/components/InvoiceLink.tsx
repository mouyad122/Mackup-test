"use client";

import React, { useEffect, useState } from 'react';

interface InvoiceLinkProps {
  orderId: string;
}

export default function InvoiceLink({ orderId }: InvoiceLinkProps) {
  // Start with a deterministic relative URL so SSR and the first client render
  // match. The browser origin is attached only after hydration.
  const relativeUrl = `/ar/invoice/${orderId}`;
  const [invoiceUrl, setInvoiceUrl] = useState(relativeUrl);

  useEffect(() => {
    setInvoiceUrl(`${window.location.origin}${relativeUrl}`);
  }, [relativeUrl]);

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
        className="p-1 rounded bg-[#3F4B32] hover:bg-[#2d3623] text-white"
        title="Copy invoice link"
      >
        نسخ
      </button>
    </div>
  );
}
