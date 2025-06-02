// utils/suggestionUtils.js

export function findAllPositions(text, searchStr) { /* ...your code... */ }
export function realignSuggestions(text, suggestions) { /* ...your code... */ }

// --- Add these below ---

export function getEditMeta(type) {
  const EDIT_TYPES = [
    { type: 'Full Edit', icon: '🪄', color: 'bg-purple-50', iconColor: 'text-purple-500', hl: 'ring-purple-400' },
    { type: 'Developmental', icon: '🖼️', color: 'bg-blue-50', iconColor: 'text-blue-400', hl: 'ring-blue-400' },
    { type: 'Structural', icon: '🪜', color: 'bg-green-50', iconColor: 'text-green-400', hl: 'ring-green-400' },
    { type: 'Line', icon: '📜', color: 'bg-yellow-50', iconColor: 'text-yellow-400', hl: 'ring-yellow-400' },
    { type: 'Copy', icon: '🔍', color: 'bg-teal-50', iconColor: 'text-teal-400', hl: 'ring-teal-400' },
    { type: 'Proof', icon: '🩹', color: 'bg-pink-50', iconColor: 'text-pink-400', hl: 'ring-pink-400' }
  ]
  return EDIT_TYPES.find(e => e.type === type) || EDIT_TYPES[0]
}

export function debounce(fn, ms) {
  let timer; return (...args) => {
    clearTimeout(timer); timer = setTimeout(() => fn(...args), ms)
  }
}

export function highlightManuscript(text, specificEdits, activeIdx, showHighlights, showNumbers) {
  if (!showHighlights || !specificEdits?.length) return text
  let out = text
  const byStart = [...specificEdits]
    .filter(s => s.state === 'pending')
    .map((s, i) => ({...s, idx: i}))
    .sort((a, b) => b.start - a.start)
  byStart.forEach((s, i) => {
    const {start, end, editType, idx} = s
    if (start == null || end == null || start >= end) return
    const before = out.slice(0, start)
    const target = out.slice(start, end)
    const after = out.slice(end)
    const meta = getEditMeta(editType)
    let style = `bg-opacity-40 ring-2 ring-inset px-0.5 rounded cursor-pointer ${meta.hl} ${activeIdx === idx ? 'ring-4 ring-black' : ''}`
    const sup = showNumbers ? `<sup class='text-xs align-super text-gray-700'>${idx+1}</sup>` : ''
    out = before +
      `<span class='lulu-suggestion ${style.replaceAll(' ','-')}' data-sug='${idx}'>${target}${sup}</span>` +
      after
  })
  return out
}
