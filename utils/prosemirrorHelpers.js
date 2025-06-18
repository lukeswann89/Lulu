import { DOMParser, DOMSerializer } from "prosemirror-model"
import { basicSchema } from "../schemas/basicSchema"
import { mapSuggestionPositions } from "../plugins/core/positionMapper"

// Convert HTML string to ProseMirror document
export function htmlToDoc(html) {
  if (!html || typeof html !== 'string') {
    return basicSchema.node('doc', null, [
      basicSchema.node('paragraph', null, [])
    ])
  }

  try {
    // Create a temporary DOM element
    const temp = document.createElement('div')
    temp.innerHTML = html.trim()
    
    // Parse with ProseMirror DOMParser
    const parser = DOMParser.fromSchema(basicSchema)
    const doc = parser.parse(temp)
    
    // Ensure document has content
    if (doc.content.size === 0) {
      return basicSchema.node('doc', null, [
        basicSchema.node('paragraph', null, [])
      ])
    }
    
    return doc
  } catch (error) {
    console.warn('Error parsing HTML to ProseMirror doc:', error)
    // Fallback: create document with text content
    return createDocFromText(html.replace(/<[^>]*>/g, ''))
  }
}

// Convert ProseMirror document to HTML string
export function docToHtml(doc) {
  if (!doc) return ''
  
  try {
    const serializer = DOMSerializer.fromSchema(basicSchema)
    const fragment = serializer.serializeFragment(doc.content)
    
    // Create temporary container
    const temp = document.createElement('div')
    temp.appendChild(fragment)
    
    return temp.innerHTML
  } catch (error) {
    console.warn('Error serializing ProseMirror doc to HTML:', error)
    return doc.textContent || ''
  }
}

// Convert plain text to ProseMirror document
export function textToDoc(text) {
  return createDocFromText(text || '')
}

// Convert ProseMirror document to plain text
export function docToText(doc) {
  return doc ? doc.textContent : ''
}

// Helper: Create document from plain text with paragraph breaks
export function createDocFromText(schema, text) {
  if (!text || typeof text !== 'string') {
    return basicSchema.node('doc', null, [
      basicSchema.node('paragraph', null, [])
    ])
  }

  // Split text into paragraphs
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim())
  
  if (paragraphs.length === 0) {
    return basicSchema.node('doc', null, [
      basicSchema.node('paragraph', null, [])
    ])
  }

  const paragraphNodes = paragraphs.map(p => {
    const trimmed = p.trim()
    if (trimmed) {
      return basicSchema.node('paragraph', null, [
        basicSchema.text(trimmed)
      ])
    } else {
      return basicSchema.node('paragraph', null, [])
    }
  })

  return basicSchema.node('doc', null, paragraphNodes)
}

// Convert API suggestions to ProseMirror-compatible format
export function processSuggestionsForDoc(suggestions, doc) {
  if (!suggestions || !Array.isArray(suggestions)) {
    return []
  }

  // Map positions to ProseMirror coordinates
  const mappedSuggestions = mapSuggestionPositions(suggestions, doc)
  
  // Filter out suggestions without valid positions
  const validSuggestions = mappedSuggestions.filter(s => 
    s.from !== null && s.to !== null && s.from < s.to
  )

  // Add IDs and default states if missing
  return validSuggestions.map((suggestion, index) => ({
    id: suggestion.id || `suggestion_${index}_${Date.now()}`,
    state: suggestion.state || 'pending',
    ...suggestion
  }))
}

// Find text position in document (alternative to position mapper)
export function findTextInDoc(doc, searchText, startPos = 0) {
  const docText = doc.textContent
  const index = docText.indexOf(searchText, startPos)
  
  if (index === -1) return null
  
  return {
    from: index + 1, // ProseMirror positions are 1-based
    to: index + 1 + searchText.length,
    text: searchText
  }
}

// Get text content between positions
export function getTextBetween(doc, from, to) {
  try {
    return doc.textBetween(from, to)
  } catch (error) {
    console.warn('Invalid position range:', from, to)
    return ''
  }
}

// Validate position range for document
export function validatePositionRange(doc, from, to) {
  return (
    from >= 1 &&
    to <= doc.content.size &&
    from < to
  )
}

// Get document statistics
export function getDocStats(doc) {
  return {
    size: doc.content.size,
    textLength: doc.textContent.length,
    nodeCount: doc.nodeSize,
    paragraphCount: countNodes(doc, 'paragraph'),
    wordCount: countWords(doc.textContent),
    charCount: doc.textContent.length
  }
}

// Count nodes of specific type
function countNodes(doc, nodeType) {
  let count = 0
  doc.descendants((node) => {
    if (node.type.name === nodeType) {
      count++
    }
  })
  return count
}

// Count words in text
function countWords(text) {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

// Transaction helpers
export function createReplaceTransaction(state, from, to, text) {
  const tr = state.tr
  tr.replaceWith(from, to, state.schema.text(text))
  return tr
}

export function createInsertTransaction(state, pos, text) {
  const tr = state.tr
  tr.insert(pos, state.schema.text(text))
  return tr
}

export function createDeleteTransaction(state, from, to) {
  const tr = state.tr
  tr.delete(from, to)
  return tr
}

// Debugging helpers
export function logDocStructure(doc, label = 'Document') {
  console.group(`${label} Structure:`)
  console.log('Size:', doc.content.size)
  console.log('Text length:', doc.textContent.length)
  console.log('Content:', doc.textContent.substring(0, 100) + '...')
  
  doc.descendants((node, pos) => {
    console.log(`${node.type.name} at ${pos}:`, node.textContent?.substring(0, 50) || '[no text]')
  })
  
  console.groupEnd()
}

export function logSuggestions(suggestions, label = 'Suggestions') {
  console.group(`${label}:`)
  suggestions.forEach((s, i) => {
    console.log(`${i + 1}. [${s.editType}] ${s.from}-${s.to}: "${s.original}" → "${s.suggestion}"`)
  })
  console.groupEnd()
}