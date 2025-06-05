// /utils/suggestionUtils.js

import { getEditMeta } from './editorConfig';

export function debounce(fn, ms) {
  let timer; 
  return (...args) => {
    clearTimeout(timer); 
    timer = setTimeout(() => fn(...args), ms)
  }
}

export function highlightManuscript(text, specificEdits, activeIdx, showHighlights, showNumbers) {
  if (!showHighlights || !specificEdits?.length) return text
  let out = text
  // Sort by descending start to avoid index shifting as we insert spans
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

export function findAllPositions(text, searchText) {
  const positions = [];
  let index = text.indexOf(searchText);
  while (index !== -1) {
    positions.push(index);
    index = text.indexOf(searchText, index + 1);
  }
  return positions;
}

export function realignSuggestions(text, suggestions) {
  return suggestions.map(sug => {
    if (!sug.original) return sug;
    const positions = findAllPositions(text, sug.original);
    if (positions.length > 0) {
      return {
        ...sug,
        start: positions[0],
        end: positions[0] + sug.original.length
      };
    }
    return sug;
  });
}