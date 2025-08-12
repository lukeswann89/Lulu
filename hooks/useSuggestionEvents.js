// /hooks/useSuggestionEvents.js
import { useEffect, useRef } from 'react'

/**
 * DOM Event Sanctuary: Delegated event handling for ProseMirror decorations
 * Attaches a single set of listeners to the editor container and forwards
 * events for elements bearing a [data-suggestion-id] attribute.
 *
 * @param {Object} params
 * @param {React.RefObject<HTMLElement>} params.editorContainerRef
 * @param {(payload: { id: string, event: Event }) => void} params.onHoverStart
 * @param {(payload: { id: string, event: Event }) => void} params.onHoverEnd
 * @param {(payload: { id: string, event: Event }) => void} params.onClickSuggestion
 */
export default function useSuggestionEvents({
  editorContainerRef,
  onHoverStart,
  onHoverEnd,
  onClickSuggestion,
}) {
  const callbacksRef = useRef({ onHoverStart, onHoverEnd, onClickSuggestion })

  useEffect(() => {
    callbacksRef.current = { onHoverStart, onHoverEnd, onClickSuggestion }
  }, [onHoverStart, onHoverEnd, onClickSuggestion])

  useEffect(() => {
    const container = editorContainerRef?.current
    if (!container) return

    const resolveId = (event) => {
      const target = event.target
      if (!(target instanceof Element)) return null
      const el = target.closest('[data-suggestion-id]')
      if (!el) return null
      const id = el.getAttribute('data-suggestion-id')
      return id ? { id, el } : null
    }

    const handleMouseEnter = (event) => {
      const resolved = resolveId(event)
      if (!resolved) return
      callbacksRef.current.onHoverStart && callbacksRef.current.onHoverStart({ id: resolved.id, event })
    }

    const handleMouseLeave = (event) => {
      const resolved = resolveId(event)
      if (!resolved) return
      callbacksRef.current.onHoverEnd && callbacksRef.current.onHoverEnd({ id: resolved.id, event })
    }

    const handleClick = (event) => {
      const resolved = resolveId(event)
      if (!resolved) return
      callbacksRef.current.onClickSuggestion && callbacksRef.current.onClickSuggestion({ id: resolved.id, event })
    }

    // Event delegation using capture phase to reliably intercept
    container.addEventListener('mouseenter', handleMouseEnter, true)
    container.addEventListener('mouseleave', handleMouseLeave, true)
    container.addEventListener('click', handleClick, true)

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter, true)
      container.removeEventListener('mouseleave', handleMouseLeave, true)
      container.removeEventListener('click', handleClick, true)
    }
  }, [editorContainerRef])
}


