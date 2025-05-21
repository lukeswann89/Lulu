import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'

// DYNAMIC MANUSCRIPT EDITOR
const LuluEditor = dynamic(() => import('../components/LuluEditor'), { ssr: false })

// --- Edit Types Config ---
const EDIT_TYPES = [
  { type: 'Full Edit', icon: '🪄', help: "A comprehensive edit across all types.", color: 'bg-purple-50', iconColor: 'text-purple-500', hl: 'ring-purple-400' },
  { type: 'Developmental', icon: '🖼️', help: "Big picture: plot, characters, theme.", color: 'bg-blue-50', iconColor: 'text-blue-400', hl: 'ring-blue-400' },
  { type: 'Structural', icon: '🪜', help: "Scene/chapter order, pacing, flow.", color: 'bg-green-50', iconColor: 'text-green-400', hl: 'ring-green-400' },
  { type: 'Line', icon: '📜', help: "Sentence clarity, word choice.", color: 'bg-yellow-50', iconColor: 'text-yellow-400', hl: 'ring-yellow-400' },
  { type: 'Copy', icon: '🔍', help: "Grammar, consistency, repetition.", color: 'bg-teal-50', iconColor: 'text-teal-400', hl: 'ring-teal-400' },
  { type: 'Proof', icon: '🩹', help: "Typos, formatting, last details.", color: 'bg-pink-50', iconColor: 'text-pink-400', hl: 'ring-pink-400' }
]
const EDIT_DEPTHS = ['Light', 'Pro', 'Intensive']
const PROFILES = ['Voice', 'Professional', 'Publisher: Penguin', 'Reader: YA', 'Creative']

const EDIT_TYPE_TOOLTIP =
`🪄 Full Edit: A comprehensive edit across all types.
🖼️ Developmental: Big picture—plot, characters, theme.
🪜 Structural: Scene/chapter order, pacing, flow.
📜 Line: Sentence clarity, word choice.
🔍 Copy: Grammar, consistency, repetition.
🩹 Proof: Typos, formatting, last details.`

function getEditMeta(type) {
  return EDIT_TYPES.find(e => e.type === type) || EDIT_TYPES[0]
}

// --- UI Components ---
function Tooltip({ text }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative">
      <span className="ml-2 text-purple-600 cursor-pointer" onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
        <span className="inline-block w-5 h-5 bg-purple-200 text-center rounded-full font-bold text-base leading-5">?</span>
      </span>
      {show && (
        <span className="absolute left-0 top-6 bg-white border border-purple-200 rounded shadow p-2 text-sm w-72 z-20 whitespace-pre-line text-gray-900">
          {text}
        </span>
      )}
    </span>
  )
}
function AccordionSection({ title, icon, count, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  return (
    <div className="mb-4 border rounded">
      <div className="flex items-center justify-between cursor-pointer p-3 bg-gray-100 font-semibold"
        onClick={() => setOpen(o => !o)}>
        <span className="flex items-center gap-2">
          {icon && <span className="text-xl">{icon}</span>}
          {title}{typeof count === "number" ? ` (${count})` : ''}
        </span>
        <span>{open ? "▼" : "►"}</span>
      </div>
      {open && <div className="p-3">{children}</div>}
    </div>
  )
}

// --- Highlight helpers for Specific Edits ---
function highlightManuscript(text, specificEdits, activeIdx, showHighlights, showNumbers) {
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
function debounce(fn, ms) {
  let timer; return (...args) => {
    clearTimeout(timer); timer = setTimeout(() => fn(...args), ms)
  }
}
export default function Home() {
  // --- State ---
  const [editType, setEditType] = useState([])
  const [mode, setMode] = useState('General Edits')
  const [editDepth, setEditDepth] = useState('Pro')
  const [editProfile, setEditProfile] = useState('Voice')
  const [thresholdOnly, setThresholdOnly] = useState(false)
  const [groupedSuggestions, setGroupedSuggestions] = useState({})
  const [writerCue, setWriterCue] = useState('')
  const [writerEdits, setWriterEdits] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const [authorship, setAuthorship] = useState({ user: 0, lulu: 0 })
  const [cueFocus, setCueFocus] = useState(false)
  const [activeRevise, setActiveRevise] = useState({ type: null, idx: null, val: '' })
  const [sessionLog, setSessionLog] = useState([])
  const [text, setText] = useState('')
  const [showEditOptions, setShowEditOptions] = useState(true)
  const [logAccordion, setLogAccordion] = useState(false)
  // Suggestions Navigation
  const [suggestionView, setSuggestionView] = useState('overview') // overview | focus
  const allSuggestions = [
    ...writerEdits.map((sug, idx) => ({...sug, isWriter: true, idx, type: "Writer's Edit"})),
    ...Object.entries(groupedSuggestions).flatMap(([type, arr]) =>
      arr.map((sug, idx) => ({...sug, isWriter: false, idx, type}))
    )
  ]
  const [focusIndex, setFocusIndex] = useState(0)
  const suggestionsLength = allSuggestions.length
  // Deep Dive / Ask Lulu (chat log per suggestion)
  const [expandedSuggestions, setExpandedSuggestions] = useState({})
  const [deepDiveContent, setDeepDiveContent] = useState({})
  const [deepDiveLoading, setDeepDiveLoading] = useState({})
  const [askLuluInputs, setAskLuluInputs] = useState({})
  const [askLuluLogs, setAskLuluLogs] = useState({})
  // Specific Edits State
  const [specificEdits, setSpecificEdits] = useState([])
  const [showHighlights, setShowHighlights] = useState(true)
  const [showNumbers, setShowNumbers] = useState(true)
  const [activeEditIdx, setActiveEditIdx] = useState(null)
  const [activePanelIdx, setActivePanelIdx] = useState(null)
  const [focusSpecificIdx, setFocusSpecificIdx] = useState(0)
  const highlightRefs = useRef({})

  // Panel scroll and highlight logic for Specific Edits
  useEffect(() => {
    if (mode === "Specific Edits" && activeEditIdx != null && highlightRefs.current && highlightRefs.current[activeEditIdx]) {
      highlightRefs.current[activeEditIdx].scrollIntoView({behavior:'smooth', block:'center'})
    }
  }, [activeEditIdx, mode])

  useEffect(() => {
    if (mode !== "Specific Edits" || !showHighlights) return
    const clickHandler = e => {
      const tgt = e.target.closest('.lulu-suggestion')
      if (!tgt) return
      const idx = +tgt.getAttribute('data-sug')
      setActiveEditIdx(idx)
      setActivePanelIdx(idx)
      debounce(() => {
        if (highlightRefs.current && highlightRefs.current[idx])
          highlightRefs.current[idx].scrollIntoView({behavior:'smooth', block:'center'})
      }, 100)()
    }
    document.addEventListener('click', clickHandler)
    return () => document.removeEventListener('click', clickHandler)
  }, [showHighlights, mode])

  function handlePanelClick(idx) {
    setActiveEditIdx(idx)
    setActivePanelIdx(idx)
    debounce(() => {
      if (highlightRefs.current && highlightRefs.current[idx])
        highlightRefs.current[idx].scrollIntoView({behavior:'smooth', block:'center'})
    }, 100)()
  }

  // --- History logic ---
  function pushHistory(suggestions, writer) {
    setHistory(h => [...h, { grouped: suggestions, writer, specific: specificEdits }])
    setRedoStack([])
  }
  function undo() {
    if (history.length === 0) return
    const prev = history[history.length-1]
    setGroupedSuggestions(prev.grouped)
    setWriterEdits(prev.writer)
    setSpecificEdits(prev.specific || [])
    setHistory(h => h.slice(0,-1))
    setRedoStack(r => [{ grouped: groupedSuggestions, writer: writerEdits, specific: specificEdits }, ...r])
  }
  function redo() {
    if (redoStack.length === 0) return
    const next = redoStack[0]
    setGroupedSuggestions(next.grouped)
    setWriterEdits(next.writer)
    setSpecificEdits(next.specific || [])
    setRedoStack(r => r.slice(1))
    setHistory(h => [...h, { grouped: groupedSuggestions, writer: writerEdits, specific: specificEdits }])
  }
  // --- Submit ---
  async function handleSubmit() {
    setLoading(true)
    setError('')
    setGroupedSuggestions({})
    setWriterEdits([])
    setSpecificEdits([])
    setAuthorship({ user: 0, lulu: 0 })
    setSessionLog([])
    try {
      const plainText = text
      const res = await fetch('/api/gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: plainText,
          editType,
          mode,
          writerCue,
          roadmapOnly: mode === "General Edits",
          editDepth,
          editProfile,
          thresholdOnly
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      let writerEditGroup = []
      let roadmapGroups = {}
      if (mode === "General Edits") {
        (data.roadmap || []).forEach(item => {
          if (item.editType === "Writer's Edit") {
            writerEditGroup.push({
              own: item.own || item.recommendation,
              lulu: item.lulu || item.luluEdit,
              why: item.why, principles: item.principles, state: 'pending',
              deepDive: null
            })
          } else {
            if (!roadmapGroups[item.editType]) roadmapGroups[item.editType] = []
            roadmapGroups[item.editType].push({
              ...item,
              state: 'pending',
              deepDive: null
            })
          }
        })
        setWriterEdits(writerEditGroup)
        setGroupedSuggestions(roadmapGroups)
        setAuthorship({ user: 100, lulu: 0 })
        pushHistory(roadmapGroups, writerEditGroup)
        setSessionLog([])
      } else if (mode === "Specific Edits") {
        // Specific Edits array
        setSpecificEdits((data.suggestions || []).map(s => ({...s, state:'pending'})))
        setAuthorship({ user: 100, lulu: 0 })
        pushHistory({}, [])
        setSessionLog([])
      }
      setShowEditOptions(false)
      setActiveEditIdx(null); setActivePanelIdx(null)
      setFocusSpecificIdx(0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  // Accept/Reject/Revise logic for General Edits as before
  function logAction(action, detail, contextText = null) {
    let context = null
    if (action === 'Suggestion' || action === 'WriterEdit') {
      const sugObj = action === 'WriterEdit'
        ? writerEdits[detail.idx]
        : (groupedSuggestions[detail.editType] || [])[detail.idx]
      const mainContent = sugObj
        ? (sugObj.lulu || sugObj.own || sugObj.recommendation || '')
        : ''
      context = `${mainContent}${detail.revision ? ` (${detail.revision})` : ''}`
    } else if (action === 'Ask Lulu') {
      context = `Q: ${detail.revision} → A: ${detail.newState}`
    }
    setSessionLog(log => [...log, {
      action,
      newState: detail.newState,
      revision: detail.revision,
      context,
      ts: new Date()
    }])
  }
  function autoAdvance() {
    if (mode === "General Edits" && suggestionView === 'focus' && suggestionsLength > 1) {
      setTimeout(() => {
        setFocusIndex(i => i < suggestionsLength - 1 ? i + 1 : i)
      }, 250)
    }
    if (mode === "Specific Edits" && specificEdits.length > 1) {
      setTimeout(() => {
        setFocusSpecificIdx(i => i < specificEdits.length - 1 ? i + 1 : i)
      }, 250)
    }
  }
  function updateWriterEdit(idx, newState, revision = null) {
    pushHistory(groupedSuggestions, writerEdits)
    setWriterEdits(eds => eds.map((e, i) => i !== idx ? e :
      { ...e, state: newState, revision: revision ?? e.revision }
    ))
    if (newState === 'accepted') setAuthorship(a => ({ ...a, user: Math.max(0, a.user-10), lulu: Math.min(100, a.lulu+10) }))
    if (newState === 'rejected') setAuthorship(a => ({ ...a, user: a.user, lulu: a.lulu }))
    setActiveRevise({ type: null, idx: null, val: '' })
    logAction('WriterEdit', { idx, newState, revision })
    autoAdvance()
  }
  function updateSuggestion(editType, idx, newState, revision = null) {
    pushHistory(groupedSuggestions, writerEdits)
    setGroupedSuggestions(groups => {
      const arr = groups[editType] || []
      return {
        ...groups,
        [editType]: arr.map((s, i) => i !== idx ? s : { ...s, state: newState, revision: revision ?? s.revision })
      }
    })
    if (newState === 'accepted') setAuthorship(a => ({ ...a, lulu: Math.min(100, a.lulu+5), user: Math.max(0, a.user-5) }))
    if (newState === 'rejected') setAuthorship(a => ({ ...a, user: a.user, lulu: a.lulu }))
    setActiveRevise({ type: null, idx: null, val: '' })
    logAction('Suggestion', { editType, idx, newState, revision })
    autoAdvance()
  }
  function startRevise(type, idx, currentVal) {
    setActiveRevise({ type, idx, val: currentVal })
  }
  function saveRevise(type, idx, newVal, writerEdit = false) {
    if (writerEdit) updateWriterEdit(idx, 'revised', newVal)
    else updateSuggestion(type, idx, 'revised', newVal)
    setActiveRevise({ type: null, idx: null, val: '' })
    autoAdvance()
  }
  function cancelRevise() {
    setActiveRevise({ type: null, idx: null, val: '' })
  }

  // --- Specific Edits: Accept/Reject/Revise ---
  function acceptSpecific(idx) {
    pushHistory(groupedSuggestions, writerEdits)
    setSpecificEdits(eds => eds.map((e,i) => i !== idx ? e : {...e, state:'accepted'}))
    setSessionLog(log => [...log, {action:'accept', idx, ts:Date.now()}])

    // UPDATE TEXT with suggestion when accepted
    setText(prevText => {
      const s = specificEdits[idx]
      if (!s || s.start == null || s.end == null) return prevText
      const before = prevText.slice(0, s.start)
      const after = prevText.slice(s.end)
      return before + (s.suggestion || s.revised || "") + after
    })

    setActiveEditIdx(null); setActivePanelIdx(null)
    autoAdvance()
  }

  function rejectSpecific(idx) {
    pushHistory(groupedSuggestions, writerEdits)
    setSpecificEdits(eds => eds.map((e,i) => i !== idx ? e : {...e, state:'rejected'}))
    setSessionLog(log => [...log, {action:'reject', idx, ts:Date.now()}])
    setActiveEditIdx(null); setActivePanelIdx(null)
    autoAdvance()
  }

  function reviseSpecific(idx, revision) {
    pushHistory(groupedSuggestions, writerEdits)
    setSpecificEdits(eds => eds.map((e,i) => i !== idx ? e : {...e, state:'revised', revision}))
    setSessionLog(log => [...log, {action:'revise', idx, ts:Date.now(), revision}])

    // UPDATE TEXT with revised value
    setText(prevText => {
      const s = specificEdits[idx]
      if (!s || s.start == null || s.end == null) return prevText
      const before = prevText.slice(0, s.start)
      const after = prevText.slice(s.end)
      return before + revision + after
    })

    setActiveEditIdx(null); setActivePanelIdx(null)
    autoAdvance()
  }

  // --- Deep Dive/Ask Lulu per suggestion (with chat log) ---
  async function handleToggleDeepDive(sKey, sug, groupType) {
    setExpandedSuggestions(exp => ({
      ...exp,
      [sKey]: !exp[sKey]
    }))
    if (!expandedSuggestions[sKey]) {
      if (!deepDiveContent[sKey]) {
        setDeepDiveLoading(d => ({...d, [sKey]: true}))
        const manuscript = text
        const res = await fetch('/api/deep-dive', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            suggestion: sug.isWriter ? (sug.lulu || sug.own) : (sug.recommendation),
            why: sug.why,
            principles: sug.principles,
            manuscript
          })
        })
        const data = await res.json()
        setDeepDiveContent(content => ({...content, [sKey]: data.deepDive || "Mentor insight unavailable."}))
        setDeepDiveLoading(d => ({...d, [sKey]: false}))
      }
    }
  }
  function handleAskLuluInput(sKey, val) {
    setAskLuluInputs(inp => ({ ...inp, [sKey]: val }))
  }
  async function handleAskLuluSubmit(sKey, sug, groupType) {
    const contextText = askLuluInputs[sKey]
    if (!contextText) return
    setAskLuluInputs(inp => ({ ...inp, [sKey]: "" }))
    setAskLuluLogs(logs => ({
      ...logs,
      [sKey]: [...(logs[sKey] || []), { who: "user", text: contextText }]
    }))
    const manuscript = text
    const res = await fetch('/api/ask-lulu', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        suggestion: sug.isWriter ? (sug.lulu || sug.own) : (sug.recommendation),
        why: sug.why,
        manuscript,
        question: contextText
      })
    })
    const data = await res.json()
    const aiAnswer = data.answer || "Lulu: Mentor response unavailable."
    setAskLuluLogs(logs => ({
      ...logs,
      [sKey]: [...(logs[sKey] || []), { who: "lulu", text: aiAnswer }]
    }))
    logAction('Ask Lulu', { newState: aiAnswer, revision: contextText })
  }

  // --- Suggestion Card for General Edits ---
  function renderSuggestionCard(sug, sugIdx, groupType) {
    const meta = getEditMeta(groupType || sug.type)
    const sKey = `${sug.isWriter ? 'w' : 's'}_${groupType || sug.type}_${sugIdx}`
    const collapsed = ['accepted', 'rejected', 'revised'].includes(sug.state)
    return (
      <div key={sKey} className={`border rounded p-3 mb-2 ${meta.color}`}>
        <div className="flex items-center mb-2">
          <span className={`mr-2 text-lg ${meta.iconColor}`}>{meta.icon}</span>
          <span className="ml-2 font-semibold">{sug.isWriter ? sug.lulu || sug.own : sug.recommendation}</span>
        </div>
        {sug.why && <div className="text-xs text-purple-700 italic mb-2">Why: {sug.why}</div>}
        <div>
          <button
            className="text-xs px-2 py-1 bg-purple-100 rounded text-purple-800 mr-2"
            onClick={() => handleToggleDeepDive(sKey, sug, groupType)}
          >
            {expandedSuggestions[sKey] ? '- Deep Dive' : '+ Deep Dive'}
          </button>
        </div>
        {expandedSuggestions[sKey] && (
          <div className="mt-2 pl-2 border-l-4 border-purple-200 bg-purple-50 rounded">
            <div className="text-sm text-purple-800 font-semibold mb-1">Mentor Insight</div>
            <div className="mb-2">{deepDiveLoading[sKey]
              ? <span className="italic text-gray-500">Loading mentor insight...</span>
              : deepDiveContent[sKey] || "Mentor insight unavailable."
            }</div>
            {sug.principles?.length > 0 && (
              <div className="mb-2 text-xs">
                <b>Principles:</b> {sug.principles.join(', ')}
              </div>
            )}
            {/* Ask Lulu Chat Log */}
            <div className="mb-2">
              {(askLuluLogs[sKey] || []).map((msg, i) => (
                <div key={i} className={msg.who === 'user'
                  ? "text-xs text-gray-800 bg-gray-50 rounded p-1 mb-1"
                  : "text-xs text-blue-700 bg-blue-50 rounded p-1 mb-1"}>
                  <b>{msg.who === "user" ? "You: " : ""}</b>{msg.text}
                </div>
              ))}
              <div className="flex items-center">
                <input
                  type="text"
                  className="w-3/4 p-1 border rounded text-sm mr-1"
                  value={askLuluInputs[sKey] || ""}
                  onChange={e => handleAskLuluInput(sKey, e.target.value)}
                  placeholder="Ask Lulu something about this suggestion..."
                  onKeyDown={e => { if (e.key === "Enter") handleAskLuluSubmit(sKey, sug, groupType) }}
                />
                <button
                  className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs"
                  onClick={() => handleAskLuluSubmit(sKey, sug, groupType)}
                >
                  Ask Lulu
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Accept/Reject/Revise/Undo buttons */}
        {!collapsed && (
          <div className="flex gap-2 mt-2">
            {sug.isWriter ? (
              <>
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                  onClick={() => updateWriterEdit(sug.idx, 'accepted')}>Keep Own</button>
                <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                  onClick={() => updateWriterEdit(sug.idx, 'accepted', sug.lulu)}>Accept Lulu’s Edit</button>
                <button className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                  onClick={() => updateWriterEdit(sug.idx, 'rejected')}>Reject</button>
                <button className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded text-xs"
                  onClick={() => startRevise('writer', sug.idx, sug.lulu || sug.own)}>Revise</button>
              </>
            ) : (
              <>
                <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                  onClick={() => updateSuggestion(sug.type, sug.idx, 'accepted')}>Accept</button>
                <button className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                  onClick={() => updateSuggestion(sug.type, sug.idx, 'rejected')}>Reject</button>
                <button className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded text-xs"
                  onClick={() => startRevise(sug.type, sug.idx, sug.suggestion || sug.recommendation)}>Revise</button>
              </>
            )}
          </div>
        )}
        {/* Revise form */}
        {activeRevise.type === (sug.isWriter ? 'writer' : sug.type) && activeRevise.idx === sug.idx && (
          <div className="mt-2">
            <textarea
              className="w-full p-2 border rounded text-base"
              rows={2}
              value={activeRevise.val}
              onChange={e => setActiveRevise(r => ({ ...r, val: e.target.value }))}
            />
            <div className="flex gap-2 mt-1">
              <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                onClick={() => saveRevise(sug.type, sug.idx, activeRevise.val, sug.isWriter)}>Save</button>
              <button className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs"
                onClick={cancelRevise}>Cancel</button>
            </div>
          </div>
        )}
        {/* Status + Undo */}
        {collapsed && (
          <div className="flex items-center gap-3 mt-2">
            <div className="text-xs">
              {sug.state.charAt(0).toUpperCase() + sug.state.slice(1)}
            </div>
            <button className="ml-4 px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs border border-purple-300"
              onClick={() => sug.isWriter
                ? updateWriterEdit(sug.idx, 'pending')
                : updateSuggestion(sug.type, sug.idx, 'pending')
              }
            >Undo</button>
          </div>
        )}
      </div>
    )
  }
  // --- All edits processed feedback ---
  const allSuggestionsLength = writerEdits.length +
    Object.values(groupedSuggestions).reduce((acc, arr) => acc + arr.length, 0)
  const totalSuggestions = allSuggestionsLength + (mode === "Specific Edits" ? specificEdits.length : 0)
  const editsProcessed =
    writerEdits.filter(e => ['accepted', 'rejected', 'revised'].includes(e.state)).length +
    Object.values(groupedSuggestions).reduce((acc, arr) =>
      acc + arr.filter(e => ['accepted', 'rejected', 'revised'].includes(e.state)).length, 0
    ) +
    (mode === "Specific Edits"
      ? specificEdits.filter(e => ['accepted','rejected','revised'].includes(e.state)).length
      : 0)
  const allDone = totalSuggestions > 0 && editsProcessed === totalSuggestions
  // --- Split-panel CSS ---
  const layoutClass = "flex flex-col md:flex-row gap-6"
  const lhsClass = "flex-1 bg-white shadow rounded-xl p-4 md:sticky md:top-8 h-fit"
  const rhsClass = "w-full md:w-[28rem] bg-white shadow rounded-xl p-4 md:sticky md:top-8 h-fit"

  function isChecked(type) {
  if (type === 'Full Edit') return editType.length === EDIT_TYPES.length - 1
  return editType.includes(type)
}
function toggleEditType(type) {
  if (type === 'Full Edit') {
    if (isChecked('Full Edit')) setEditType([])
    else setEditType(EDIT_TYPES.filter(t => t.type !== 'Full Edit').map(t => t.type))
    return
  }
  setEditType(prev =>
    prev.includes(type)
      ? prev.filter(t => t !== type)
      : [...prev, type]
  )
}

  // --- UI ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center text-purple-700">Lulu Mentor App</h1>
        <div className="flex flex-col md:flex-row gap-6">
          {/* LHS: Manuscript Editor */}
          <div className="flex-1 bg-white shadow rounded-xl p-4 md:sticky md:top-8 h-fit">
            <label className="font-semibold block mb-1 text-lg">Your Manuscript</label>
            {mode === "Specific Edits" && specificEdits.length && showHighlights ? (
              <div
                className="border rounded min-h-[14rem] p-3 text-base whitespace-pre-wrap font-serif"
                style={{outline:'2px solid #a78bfa', position:'relative', minHeight:'300px'}}
                dangerouslySetInnerHTML={{__html: highlightManuscript(text, specificEdits, activeEditIdx, showHighlights, showNumbers)}}
              />
            ) : (
              <LuluEditor value={text} setValue={setText} />
            )}
            {mode === "Specific Edits" && (
              <div className="flex gap-2 my-2 items-center">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={showHighlights} onChange={e=>setShowHighlights(e.target.checked)} />
                  Show Suggestions Highlighted
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={showNumbers} onChange={e=>setShowNumbers(e.target.checked)} />
                  Show Numbered Badges
                </label>
                <button className="ml-auto px-3 py-1 bg-gray-200 rounded" onClick={undo}>Undo</button>
                <button className="px-3 py-1 bg-gray-200 rounded" onClick={redo}>Redo</button>
              </div>
            )}
            {!showEditOptions && mode === "General Edits" && (
              <div className="mt-6 mb-4">
                <b>Authorship meter:</b>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-purple-200 px-2 rounded">User: {authorship.user}%</span>
                  <span className="bg-blue-200 px-2 rounded">Lulu: {authorship.lulu}%</span>
                </div>
              </div>
            )}
          </div>
          {/* RHS: Options + Suggestion Panel */}
          <div className="w-full md:w-[28rem] bg-white shadow rounded-xl p-4 md:sticky md:top-8 h-fit" style={{ minWidth: '24rem' }}>
            {showEditOptions ? (
              <>
                <label className="font-semibold flex items-center mt-2 mb-1">
                  Writer’s Editing Notes
                  <Tooltip text="Give Lulu your personal instructions or editing requests—she’ll prioritise these as writer’s edits."/>
                </label>
                <textarea
                  className="w-full p-2 border rounded mb-4 text-base focus:border-purple-400 focus:ring-purple-400"
                  rows={3}
                  style={{
                    color: !cueFocus && !writerCue ? '#888' : '#222'
                  }}
                  placeholder="Add any specific instructions or desired edits for Lulu to consider."
                  value={cueFocus || writerCue ? writerCue : ''}
                  onFocus={() => setCueFocus(true)}
                  onBlur={() => setCueFocus(false)}
                  onChange={e => setWriterCue(e.target.value)}
                />
                <div className="mb-3">
                  <label className="font-semibold block mb-1">
                    Edit Types:
                    <Tooltip text={EDIT_TYPE_TOOLTIP}/>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {EDIT_TYPES.map(et => (
                      <label key={et.type} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked(et.type)}
                          onChange={() => toggleEditType(et.type)}
                        />
                        <span className="flex items-center gap-1">{et.icon} {et.type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mb-3">
                  <div>
                    <label className="font-semibold block mb-1">Edit Depth:</label>
                    <select className="p-2 border rounded w-full focus:border-purple-400" value={editDepth} onChange={e => setEditDepth(e.target.value)}>
                      {EDIT_DEPTHS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Editorial Profile:</label>
                    <select className="p-2 border rounded w-full focus:border-purple-400" value={editProfile} onChange={e => setEditProfile(e.target.value)}>
                      {PROFILES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 font-semibold mt-6">
                    <input type="checkbox" checked={thresholdOnly} onChange={() => setThresholdOnly(x => !x)} />
                    World-Class Threshold Only
                  </div>
                </div>
                <div className="mb-3">
                  <label className="font-semibold block mb-1">Editing Mode:</label>
                  <select className="p-2 border rounded w-full focus:border-purple-400" value={mode} onChange={e => setMode(e.target.value)}>
                    <option>General Edits</option>
                    <option>Specific Edits</option>
                  </select>
                </div>
                <div className="flex gap-3 mb-3">
                  <button onClick={handleSubmit} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold">
                    {loading ? "Thinking..." : "Submit to Lulu"}
                  </button>
                </div>
                {error && <div className="text-red-500 mb-4">{error}</div>}
              </>
            ) : (
              <>
                <button
                  className="mb-6 px-4 py-2 bg-purple-600 text-white rounded font-semibold"
                  onClick={() => setShowEditOptions(true)}
                >
                  Return to Edit Options
                </button>
                {/* General Edits Panel */}
                {mode === "General Edits" && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-2xl font-semibold text-purple-800">Suggestions</h2>
                      <div className="flex gap-1">
                        <button className={`px-2 py-1 rounded ${suggestionView === 'overview' ? 'bg-purple-200 font-bold' : 'bg-gray-100'}`}
                          onClick={() => setSuggestionView('overview')}>Overview</button>
                        <button className={`px-2 py-1 rounded ${suggestionView === 'focus' ? 'bg-purple-200 font-bold' : 'bg-gray-100'}`}
                          onClick={() => setSuggestionView('focus')}>Focus View</button>
                      </div>
                    </div>
                    {allDone && (
                      <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-400 text-green-700 font-semibold rounded">
                        ✅ All edits processed. Great work!
                      </div>
                    )}
                    {suggestionView === 'overview' ? (
                      <>
                        {writerEdits.length > 0 && (
                          <AccordionSection
                            title="Writer’s Edit"
                            icon="👤"
                            count={writerEdits.length}
                            defaultOpen
                          >
                            {writerEdits.map((item, idx) => renderSuggestionCard({...item, isWriter: true, idx}, idx, "Writer's Edit"))}
                          </AccordionSection>
                        )}
                        {Object.entries(groupedSuggestions).map(([type, arr]) => {
                          const meta = getEditMeta(type)
                          return (
                            <AccordionSection
                              key={type}
                              title={type}
                              icon={meta.icon}
                              count={arr.length}
                              defaultOpen={arr.length <= 3}
                            >
                              {arr.map((sug, idx) => renderSuggestionCard({...sug, isWriter: false, idx, type}, idx, type))}
                            </AccordionSection>
                          )
                        })}
                      </>
                    ) : (
                      <>
                        {suggestionsLength > 0 ? (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <b>{focusIndex + 1} of {suggestionsLength}</b>
                            </div>
                            {renderSuggestionCard(allSuggestions[focusIndex], focusIndex, allSuggestions[focusIndex].type)}
                            <div className="flex justify-between mt-3">
                              <button
                                disabled={focusIndex === 0}
                                className="px-3 py-1 bg-purple-100 text-purple-800 rounded disabled:opacity-50"
                                onClick={() => setFocusIndex(i => Math.max(0, i-1))}
                              >Prev</button>
                              <button
                                disabled={focusIndex === suggestionsLength - 1}
                                className="px-3 py-1 bg-purple-100 text-purple-800 rounded disabled:opacity-50"
                                onClick={() => setFocusIndex(i => Math.min(suggestionsLength-1, i+1))}
                              >Next</button>
                            </div>
                          </div>
                        ) : (
                          <div className="mb-4 text-gray-600 italic">No suggestions to display.</div>
                        )}
                      </>
                    )}
                  </>
                )}
                {/* Specific Edits Panel */}
                {mode === "Specific Edits" && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-2xl font-semibold text-blue-800">Specific Edit Suggestions</h2>
                      <div className="flex gap-2">
                        <button className="px-2 py-1 bg-blue-100 rounded" onClick={undo}>Undo</button>
                        <button className="px-2 py-1 bg-blue-100 rounded" onClick={redo}>Redo</button>
                      </div>
                    </div>
                    <div className="mb-3 flex gap-3">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={showHighlights} onChange={e=>setShowHighlights(e.target.checked)} />
                        Show Highlights
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={showNumbers} onChange={e=>setShowNumbers(e.target.checked)} />
                        Number Badges
                      </label>
                    </div>
                    <div>
                      {specificEdits.map((s, idx) => {
                        const meta = getEditMeta(s.editType)
                        return (
                          <div
                            key={idx}
                            ref={el => highlightRefs.current[idx] = el}
                            className={`mb-3 border-l-4 p-3 cursor-pointer ${meta.color} ${activePanelIdx===idx?'ring-2 ring-black':''}`}
                            onClick={()=>handlePanelClick(idx)}
                          >
                            <div className="flex items-center">
                              <span className={`mr-2 text-lg ${meta.iconColor}`}>{meta.icon}</span>
                              <span className="font-semibold">{s.original || text.slice(s.start, s.end)}</span>
                              <span className="ml-2 bg-gray-200 text-xs rounded px-2 py-0.5">{s.editType}</span>
                              {showNumbers && <sup className="ml-2 text-xs text-gray-600">{idx+1}</sup>}
                            </div>
                            {s.why && <div className="text-xs text-blue-700 italic mb-1">Why: {s.why}</div>}
                            <div className="flex gap-2 mt-2">
                              <button className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
                                disabled={s.state!=="pending"}
                                onClick={()=>acceptSpecific(idx)}>Accept</button>
                              <button className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                                disabled={s.state!=="pending"}
                                onClick={()=>rejectSpecific(idx)}>Reject</button>
                              <button className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 rounded text-xs"
                                disabled={s.state!=="pending"}
                                onClick={()=>setActiveEditIdx(idx)}>Revise</button>
                            </div>
                            {activeEditIdx===idx && s.state==='pending' && (
                              <div className="mt-2">
                                <textarea
                                  className="w-full p-1 border rounded"
                                  rows={2}
                                  defaultValue={s.revised || s.suggestion || ''}
                                  onBlur={e=>reviseSpecific(idx, e.target.value)}
                                />
                              </div>
                            )}
                            {["accepted","rejected","revised"].includes(s.state) && (
                              <span className="text-xs ml-3">
                                {s.state.charAt(0).toUpperCase()+s.state.slice(1)}
                                <button className="ml-2 text-xs text-purple-800 underline"
                                  onClick={()=>setSpecificEdits(edits=>edits.map((e,i)=>i===idx?{...e,state:'pending'}:e))}
                                >Undo</button>
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
                {/* Learning Log */}
                <div className="mt-8 rounded bg-purple-50 border border-purple-200">
                  <div className="flex items-center justify-between p-2 cursor-pointer" onClick={()=>setLogAccordion(a=>!a)}>
                    <h3 className="font-bold text-purple-700 mb-0">🪄 Learning Log</h3>
                    <span>{logAccordion ? '▲' : '▼'}</span>
                  </div>
                  {logAccordion && (
                    <div className="p-2">
                      {sessionLog.length === 0 ? (
                        <div className="text-sm text-gray-500">As you accept, reject, or revise, your learning progress will appear here.</div>
                      ) : (
                        <ul className="list-disc ml-5 text-sm">
                          {sessionLog.map((entry, idx) => (
                            <li key={idx}>
                              {entry.action === 'Ask Lulu'
                                ? <><b>Ask Lulu:</b> {entry.context}</>
                                : <><b>{entry.action}:</b> {entry.context}</>
                              }
                              <span className="ml-2 text-gray-500">{entry.ts && new Date(entry.ts).toLocaleTimeString()}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
