'use client';

import { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b pb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-gray-400 text-sm">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
