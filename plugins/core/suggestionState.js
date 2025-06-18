import { DecorationSet, Decoration } from "prosemirror-view"
import { v4 as uuidv4 } from "uuid"

// Helper function to assign colors based on edit type (matches your existing colors)
function getColorForEditType(editType) {
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

export class SuggestionState {
  constructor(suggestions = [], decorations = DecorationSet.empty) {
    this.suggestions = suggestions.map(s => ({
      ...s,
      id: s.id || uuidv4(),
      color: getColorForEditType(s.editType),
      state: s.state || 'pending'
    }))
    this.decorations = decorations
  }

  // Apply document transaction and update positions
  apply(tr) {
    let newSuggestions = this.suggestions
    let newDecorations = this.decorations

    // Remap decorations through transaction
    newDecorations = newDecorations.map(tr.mapping, tr.doc)

    // If we have suggestion updates in the transaction metadata
    const suggestionMeta = tr.getMeta('suggestions')
    if (suggestionMeta) {
      switch (suggestionMeta.type) {
        case 'add':
          newSuggestions = [...newSuggestions, ...suggestionMeta.suggestions]
          break
        case 'update':
          newSuggestions = newSuggestions.map(s => 
            s.id === suggestionMeta.id 
              ? { ...s, ...suggestionMeta.changes }
              : s
          )
          break
        case 'remove':
          newSuggestions = newSuggestions.filter(s => s.id !== suggestionMeta.id)
          break
        case 'clear':
          newSuggestions = []
          break
      }
    }

    // Rebuild decorations if suggestions changed
    if (suggestionMeta || tr.docChanged) {
      newDecorations = this.buildDecorations(tr.doc, newSuggestions)
    }

    return new SuggestionState(newSuggestions, newDecorations)
  }

  // Build decoration set from current suggestions
  buildDecorations(doc, suggestions = this.suggestions) {
    const decorations = []
    
    suggestions.forEach(suggestion => {
      if (suggestion.state !== 'pending') return

      // Find text positions in document
      const positions = this.findTextPositions(doc, suggestion.original)
      
      if (positions.length > 0) {
        // Use closest position to stored start if available
        let bestPosition = positions[0]
        if (typeof suggestion.start === 'number') {
          let minDistance = Math.abs(positions[0].from - suggestion.start)
          positions.forEach(pos => {
            const distance = Math.abs(pos.from - suggestion.start)
            if (distance < minDistance) {
              minDistance = distance
              bestPosition = pos
            }
          })
        }

        // Create decoration
        decorations.push(
          Decoration.inline(bestPosition.from, bestPosition.to, {
            class: `lulu-suggestion lulu-suggestion-${suggestion.id}`,
            'data-suggestion-id': suggestion.id,
            'data-edit-type': suggestion.editType,
            style: `background-color: ${suggestion.color}; border-radius: 4px; padding: 2px; cursor: pointer; transition: opacity 0.2s;`
          })
        )

        // Update suggestion with current position
        suggestion.currentFrom = bestPosition.from
        suggestion.currentTo = bestPosition.to
      }
    })

    return DecorationSet.create(doc, decorations)
  }

  // Find all positions of text in document
  findTextPositions(doc, searchText) {
    const positions = []
    const docText = doc.textContent
    let index = 0
    
    while ((index = docText.indexOf(searchText, index)) !== -1) {
      positions.push({
        from: index + 1, // ProseMirror positions are 1-based
        to: index + 1 + searchText.length
      })
      index += 1
    }
    
    return positions
  }

  // Get suggestion by ID
  getSuggestion(id) {
    return this.suggestions.find(s => s.id === id)
  }

  // Get pending suggestions
  getPendingSuggestions() {
    return this.suggestions.filter(s => s.state === 'pending')
  }

  // Get processed suggestions
  getProcessedSuggestions() {
    return this.suggestions.filter(s => s.state !== 'pending')
  }
}