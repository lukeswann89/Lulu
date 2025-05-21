import React from 'react'

export default function SpecificEditsPanel({
  suggestions,
  activeIdx,
  onFocus,
  onAccept,
  onReject,
  onRevise,
  getEditMeta,
}) {
  if (!Array.isArray(suggestions) || suggestions.length === 0)
    return <div className="text-gray-400 italic">No specific suggestions found.</div>
  return (
    <div>
      {suggestions.map((sug, i) => {
        const meta = getEditMeta ? getEditMeta(sug.editType || sug.type) : {}
        return (
          <div
            key={i}
            className={`mb-3 p-3 rounded border-l-4
              ${activeIdx === i ? 'border-purple-600 bg-purple-50' : 'border-gray-200 bg-gray-50'}
              flex flex-col gap-1 group cursor-pointer`}
            onClick={() => onFocus(i)}
            tabIndex={0}
            aria-label={`Suggestion ${i + 1}: ${sug.editType || sug.type}`}
          >
            <div className="flex items-center gap-2">
              <span className={`text-xl ${meta.iconColor}`}>{meta.icon || '✏️'}</span>
              <b>{sug.suggestion || sug.recommendation}</b>
              <sup className="ml-2 px-1 text-xs bg-purple-200 rounded">{i + 1}</sup>
            </div>
            <div className="text-xs italic text-purple-800">{sug.why}</div>
            {sug.principles?.length > 0 &&
              <div className="text-xs text-blue-700">Principles: {sug.principles.join(', ')}</div>
            }
            <div className="flex gap-2 mt-1">
              <button className="bg-green-500 text-white px-2 py-1 rounded text-xs"
                onClick={e => { e.stopPropagation(); onAccept(i) }}>Accept</button>
              <button className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                onClick={e => { e.stopPropagation(); onReject(i) }}>Reject</button>
              <button className="bg-yellow-400 text-white px-2 py-1 rounded text-xs"
                onClick={e => { e.stopPropagation(); onRevise(i) }}>Revise</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
