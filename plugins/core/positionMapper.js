// Utilities for position mapping and text manipulation in ProseMirror

export class PositionMapper {
  constructor(doc) {
    this.doc = doc
  }

  // Convert string offset to ProseMirror position
  offsetToPosition(offset) {
    // ProseMirror positions are 1-based and include node boundaries
    // Simple conversion: offset + 1 for document start
    return Math.min(offset + 1, this.doc.content.size)
  }

  // Convert ProseMirror position to string offset
  positionToOffset(pos) {
    // Convert back to 0-based string offset
    return Math.max(pos - 1, 0)
  }

  // Find text at given position range
  getTextRange(from, to) {
    try {
      return this.doc.textBetween(from, to)
    } catch (e) {
      console.warn('Invalid position range:', from, to)
      return ''
    }
  }

  // Validate position is within document bounds
  validatePosition(pos) {
    return pos >= 0 && pos <= this.doc.content.size
  }

  // Find all occurrences of text in document
  findAllOccurrences(searchText) {
    const docText = this.doc.textContent
    const occurrences = []
    let index = 0

    while ((index = docText.indexOf(searchText, index)) !== -1) {
      const from = this.offsetToPosition(index)
      const to = this.offsetToPosition(index + searchText.length)
      
      if (this.validatePosition(from) && this.validatePosition(to)) {
        occurrences.push({ from, to, text: searchText })
      }
      
      index += 1
    }

    return occurrences
  }

  // Get closest valid position
  getClosestValidPosition(targetPos) {
    if (targetPos < 0) return 1
    if (targetPos > this.doc.content.size) return this.doc.content.size
    return targetPos
  }

  // Check if position range is valid for replacement
  canReplaceRange(from, to) {
    return (
      this.validatePosition(from) &&
      this.validatePosition(to) &&
      from < to &&
      from >= 1 &&
      to <= this.doc.content.size
    )
  }

  // Get word boundaries around position
  getWordBoundaries(pos) {
    const docText = this.doc.textContent
    const offset = this.positionToOffset(pos)
    
    let start = offset
    let end = offset

    // Find word start
    while (start > 0 && /\w/.test(docText[start - 1])) {
      start--
    }

    // Find word end
    while (end < docText.length && /\w/.test(docText[end])) {
      end++
    }

    return {
      from: this.offsetToPosition(start),
      to: this.offsetToPosition(end)
    }
  }

  // Get paragraph boundaries around position
  getParagraphBoundaries(pos) {
    let paragraphStart = 1
    let paragraphEnd = this.doc.content.size

    // Walk through document to find paragraph containing position
    let currentPos = 1
    this.doc.descendants((node, nodePos) => {
      if (node.type.name === 'paragraph') {
        const nodeEnd = nodePos + node.nodeSize
        if (nodePos <= pos && pos <= nodeEnd) {
          paragraphStart = nodePos + 1
          paragraphEnd = nodeEnd - 1
          return false // Stop walking
        }
      }
      currentPos = nodePos + node.nodeSize
    })

    return { from: paragraphStart, to: paragraphEnd }
  }
}

// Utility functions for working with suggestions and positions

export function createPositionMapper(doc) {
  return new PositionMapper(doc)
}

export function mapSuggestionPositions(suggestions, doc) {
  const mapper = new PositionMapper(doc)
  
  return suggestions.map(suggestion => {
    // If we have start/end from API, convert to ProseMirror positions
    if (typeof suggestion.start === 'number' && typeof suggestion.end === 'number') {
      const from = mapper.offsetToPosition(suggestion.start)
      const to = mapper.offsetToPosition(suggestion.end)
      
      return {
        ...suggestion,
        from,
        to,
        originalStart: suggestion.start,
        originalEnd: suggestion.end
      }
    }

    // Otherwise, try to find the text in the document
    const occurrences = mapper.findAllOccurrences(suggestion.original)
    if (occurrences.length > 0) {
      // Use first occurrence for now
      const occurrence = occurrences[0]
      return {
        ...suggestion,
        from: occurrence.from,
        to: occurrence.to,
        originalStart: mapper.positionToOffset(occurrence.from),
        originalEnd: mapper.positionToOffset(occurrence.to)
      }
    }

    // Fallback: no position found
    console.warn('Could not find position for suggestion:', suggestion.original)
    return {
      ...suggestion,
      from: null,
      to: null,
      originalStart: null,
      originalEnd: null
    }
  })
}