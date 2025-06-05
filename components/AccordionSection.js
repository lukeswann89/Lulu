// /components/AccordionSection.jsx

import React, { useState } from 'react';

export default function AccordionSection({ 
  title, 
  icon, 
  count, 
  children, 
  defaultOpen = true 
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-4 border rounded">
      <div 
        className="flex items-center justify-between cursor-pointer p-3 bg-gray-100 font-semibold hover:bg-gray-200 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="flex items-center gap-2">
          {icon && <span className="text-xl">{icon}</span>}
          {title}
          {typeof count === "number" && <span className="text-sm text-gray-600">({count})</span>}
        </span>
        <span className="text-gray-500">{open ? "▼" : "►"}</span>
      </div>
      {open && (
        <div className="p-3">
          {children}
        </div>
      )}
    </div>
  );
}