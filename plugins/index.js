// Plugin registry for Lulu ProseMirror editor
import { history } from "prosemirror-history"
import { keymap } from "prosemirror-keymap"
import { baseKeymap } from "prosemirror-commands"
import { dropCursor } from "prosemirror-dropcursor"
import { gapCursor } from "prosemirror-gapcursor"
import { createSuggestionPlugin } from "./suggestionPlugin"

// Essential plugins for Stage 1A
export function createEssentialPlugins(options = {}) {
  return [
    // History plugin for undo/redo (replaces custom history system)
    history(),
    
    // Basic keyboard shortcuts
    keymap(baseKeymap),
    
    // Visual feedback plugins
    dropCursor(),
    gapCursor(),
    
    // Our custom suggestion plugin
    createSuggestionPlugin({
      onSuggestionClick: options.onSuggestionClick,
      onSuggestionHover: options.onSuggestionHover,
      onSuggestionAccept: options.onSuggestionAccept,
      onSuggestionReject: options.onSuggestionReject,
      onViewUpdate: options.onViewUpdate,
      onDestroy: options.onDestroy
    })
  ]
}

// Bonus plugins for Stage 1B (ready to add)
export function createBonusPlugins() {
  // These will be added in Stage 1B
  return [
    // keymap for custom shortcuts
    keymap({
      "Mod-z": () => true, // Custom undo
      "Mod-y": () => true, // Custom redo
      "Mod-f": () => true, // Find/replace (Phase 3)
      "Escape": () => true  // Clear selection
    })
  ]
}

// Full plugin set (for future phases)
export function createFullPluginSet(options = {}) {
  return [
    ...createEssentialPlugins(options),
    ...createBonusPlugins()
  ]
}

// Plugin configuration helpers
export const pluginConfigs = {
  // History configuration
  history: {
    depth: 100,
    newGroupDelay: 500
  },
  
  // Suggestion plugin configuration
  suggestions: {
    highlightClass: 'lulu-suggestion',
    activeClass: 'lulu-suggestion-active',
    hoverClass: 'lulu-suggestion-hover'
  },
  
  // Keymap configuration
  keymap: {
    'Mod-Enter': 'acceptSuggestion',
    'Mod-Backspace': 'rejectSuggestion',
    'Mod-r': 'reviseSuggestion',
    'Tab': 'nextSuggestion',
    'Shift-Tab': 'prevSuggestion'
  }
}

// Export individual plugins for flexibility
export {
  history,
  keymap,
  baseKeymap,
  dropCursor,
  gapCursor,
  createSuggestionPlugin
}