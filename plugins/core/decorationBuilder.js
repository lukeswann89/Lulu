import { Decoration, DecorationSet } from "prosemirror-view"

// Helper to get color for edit type (matches existing color scheme)
function getEditTypeColor(editType) {
  const colors = {
    'Line': '#ffe29b',      // Yellow
    'Copy': '#fecaca',      // Light red  
    'Developmental': '#fed7aa', // Light orange
    'Structural': '#d1fae5',    // Light green
    'Proof': '#e0e7ff',     // Light blue
    'Other': '#f3e8ff'      // Light purple
  }
  return colors[editType] || colors['Other']
}

// Helper to get text color for contrast
function getTextColor(backgroundColor) {
  // Simple contrast calculation
  const hex = backgroundColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128 ? '#333333' : '#ffffff'
}

export class DecorationBuilder {
  constructor() {
    this.decorations = []
  }

  // Create decoration for a suggestion
  createSuggestionDecoration(suggestion, from, to) {
    const backgroundColor = getEditTypeColor(suggestion.editType)
    const textColor = getTextColor(backgroundColor)
    
    const decoration = Decoration.inline(from, to, {
      class: `lulu-suggestion lulu-suggestion-${suggestion.id} lulu-edit-${suggestion.editType.toLowerCase()}`,
      'data-suggestion-id': suggestion.id,
      'data-edit-type': suggestion.editType,
      'data-original': suggestion.original,
      'data-suggestion-text': suggestion.suggestion,
      title: `${suggestion.editType}: ${suggestion.suggestion}\n\nReason: ${suggestion.why}\n\nClick to apply`,
      style: [
        `background-color: ${backgroundColor}`,
        `color: ${textColor}`,
        'border-radius: 4px',
        'padding: 2px 4px',
        'margin: 0 1px',
        'cursor: pointer',
        'transition: all 0.2s ease',
        'border: 1px solid rgba(0,0,0,0.1)',
        'box-shadow: 0 1px 3px rgba(0,0,0,0.1)'
      ].join('; ')
    })

    return decoration
  }

  // Create decoration for hover effect
  createHoverDecoration(suggestion, from, to) {
    const backgroundColor = getEditTypeColor(suggestion.editType)
    const hoverColor = this.adjustColorBrightness(backgroundColor, -20)
    
    return Decoration.inline(from, to, {
      class: `lulu-suggestion lulu-suggestion-${suggestion.id} lulu-suggestion-hover`,
      style: [
        `background-color: ${hoverColor}`,
        'transform: scale(1.02)',
        'box-shadow: 0 2px 8px rgba(0,0,0,0.2)',
        'z-index: 10'
      ].join('; ')
    })
  }

  // Create decoration for selected/active suggestion
  createActiveDecoration(suggestion, from, to) {
    const backgroundColor = getEditTypeColor(suggestion.editType)
    
    return Decoration.inline(from, to, {
      class: `lulu-suggestion lulu-suggestion-${suggestion.id} lulu-suggestion-active`,
      style: [
        `background-color: ${backgroundColor}`,
        'border: 2px solid #7c3aed',
        'box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2)',
        'transform: scale(1.02)',
        'z-index: 20'
      ].join('; ')
    })
  }

  // Build decoration set from suggestions
  buildDecorationSet(doc, suggestions, activeId = null, hoverId = null) {
    const decorations = []

    suggestions.forEach(suggestion => {
      if (suggestion.state !== 'pending' || !suggestion.from || !suggestion.to) {
        return
      }

      // Validate positions
      if (suggestion.from < 1 || suggestion.to > doc.content.size || suggestion.from >= suggestion.to) {
        console.warn('Invalid suggestion position:', suggestion)
        return
      }

      // Create appropriate decoration based on state
      let decoration
      if (suggestion.id === activeId) {
        decoration = this.createActiveDecoration(suggestion, suggestion.from, suggestion.to)
      } else if (suggestion.id === hoverId) {
        decoration = this.createHoverDecoration(suggestion, suggestion.from, suggestion.to)
      } else {
        decoration = this.createSuggestionDecoration(suggestion, suggestion.from, suggestion.to)
      }

      decorations.push(decoration)
    })

    return DecorationSet.create(doc, decorations)
  }

  // Utility to adjust color brightness
  adjustColorBrightness(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = Math.max(0, Math.min(255, (num >> 16) + amount))
    const g = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amount))
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
  }

  // Create widget decoration (for future use - e.g., suggestion cards)
  createWidgetDecoration(pos, element) {
    return Decoration.widget(pos, element, {
      side: 1,
      key: 'suggestion-widget'
    })
  }

  // Create node decoration (for future use - e.g., highlighting entire paragraphs)
  createNodeDecoration(from, to, attrs = {}) {
    return Decoration.node(from, to, attrs)
  }
}

// Factory function
export function createDecorationBuilder() {
  return new DecorationBuilder()
}

// Utility function to rebuild decorations when suggestions change
export function rebuildDecorations(doc, suggestions, activeId = null, hoverId = null) {
  const builder = new DecorationBuilder()
  return builder.buildDecorationSet(doc, suggestions, activeId, hoverId)
}