import React, { useRef, useEffect } from 'react'

export default function LuluHighlightEditor({
  text,
  suggestions = [],
  activeIdx = null,
  onHighlightClick = () => {},
  highlightMode = true // Toggle to turn highlights on/off
}) {
  // Build map of {start, end, editType, badge, idx}
  let spans = []
  let remainder = text
  let lastIdx = 0
  let runningOffset = 0
  // Sort by start index to avoid overlap errors
  const refs = useRef([])

  // Map suggestions to highlight spans in order
  if (highlightMode && suggestions.length > 0) {
    // For each suggestion, find offset of "original" text or use start/end if present
    let cursor = 0
    for (let i = 0; i < suggestions.length; ++i) {
      const sug = suggestions[i]
      const original = sug.original || ''
      let start = sug.start
      let end = sug.end
      if (start == null && original) {
        // Find first matching substring after last highlight
        const idx = text.indexOf(original, cursor)
        if (idx !== -1) {
          start = idx
          end = idx + original.length
          cursor = end // Move cursor to avoid overlapping highlights
        }
      }
      if (typeof start === 'number' && typeof end === 'number' && start < end) {
        spans.push({
          start, end,
          editType: sug.editType || sug.type || 'Line',
          why: sug.why,
          principles: sug.principles || [],
          badge: i + 1,
          idx: i,
        })
      }
    }
    // Sort spans by start (for non-overlapping wrap)
    spans.sort((a, b) => a.start - b.start)
  }

  // Build highlighted JSX
  let out = []
  let last = 0
  for (let i = 0; i < spans.length; ++i) {
    const { start, end, editType, why, badge, idx, principles } = spans[i]
    if (last < start) out.push(text.slice(last, start))
    // Define style/color/icon for this edit type
    let meta = (typeof getEditMeta === "function" ? getEditMeta(editType) : {})
    const colorClass = meta.color || 'bg-yellow-100'
    const icon = meta.icon || '✏️'
    out.push(
      <span
        ref={el => refs.current[idx] = el}
        key={`hl-${i}`}
        className={`${colorClass} px-1 py-0.5 rounded cursor-pointer transition-all duration-150
          ${activeIdx === idx ? 'ring-2 ring-purple-500' : 'hover:ring-2 hover:ring-purple-300'}
        `}
        tabIndex={0}
        onClick={() => onHighlightClick(idx)}
        title={`${icon} ${editType}: ${why || ''} ${principles && principles.length ? '\nPrinciples: ' + principles.join(', ') : ''}`}
        aria-label={`${editType} suggestion ${badge}`}
      >
        {icon} <sup className="text-xs">{badge}</sup>
        {text.slice(start, end)}
      </span>
    )
    last = end
  }
  if (last < text.length) out.push(text.slice(last))

  // Auto-scroll active highlight into view
  useEffect(() => {
    if (activeIdx != null && refs.current[activeIdx]) {
      refs.current[activeIdx].scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIdx])

  return (
    <div className="whitespace-pre-wrap text-base leading-7 font-serif select-text">
      {out}
    </div>
  )
}
