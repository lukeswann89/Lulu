import { useState } from 'react'

export default function AccordionSection({ title, icon, count, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  return (
    <div className="mb-4 border rounded">
      <div className="flex items-center justify-between cursor-pointer p-3 bg-gray-100 font-semibold hover:bg-gray-200"
        onClick={() => setOpen(o => !o)}>
        <span className="flex items-center gap-2">
          {icon && <span className="text-xl">{icon}</span>}
          {title}{typeof count === "number" ? ` (${count})` : ''}
        </span>
        <span className="text-gray-600">{open ? "▼" : "►"}</span>
      </div>
      {open && <div className="p-3">{children}</div>}
    </div>
  )
}