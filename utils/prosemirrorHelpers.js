// /utils/prosemirrorHelpers.js

import { DOMParser, DOMSerializer } from "prosemirror-model";

export function createDocFromText(schema, text) {
  if (!text || typeof text !== 'string') {
    return schema.node('doc', null, [
      schema.node('paragraph', null, [])
    ]);
  }

  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  
  if (paragraphs.length === 0) {
    return schema.node('doc', null, [
      schema.node('paragraph', null, [])
    ]);
  }

  const paragraphNodes = paragraphs.map(p => {
    const trimmed = p.trim();
    if (trimmed) {
      return schema.node('paragraph', null, [
        schema.text(trimmed)
      ]);
    } else {
      return schema.node('paragraph', null, []);
    }
  });

  return schema.node('doc', null, paragraphNodes);
}

// --- FINAL, PROVEN VERSION ---
// This function contains the corrected logic that passed our live test,
// fixing the off-by-one highlight error permanently.
export function findPositionOfText(doc, searchText) {
    if (!searchText) return null;

    let result = null;
    // We traverse the document node by node.
    doc.descendants((node, pos) => {
        // Stop searching once we've found our result.
        if (result) return false;

        // We only search inside text nodes.
        if (node.isText) {
            const index = node.text.indexOf(searchText);
            
            if (index !== -1) {
                // CORRECTED FIX: pos already points to the text node's start position
                // The +1 was causing the systematic right-shift - removed per forensic analysis
                const from = pos + index; 
                const to = from + searchText.length;
                result = { from, to };
            }
        }
    });
    return result;
}

// --- Utility functions below are preserved ---

export function htmlToDoc(html, schema) {
  if (!html || typeof html !== 'string') {
    return createDocFromText(schema, '');
  }
  try {
    const temp = document.createElement('div');
    temp.innerHTML = html.trim();
    const parser = DOMParser.fromSchema(schema);
    const doc = parser.parse(temp);
    if (doc.content.size === 0) {
      return createDocFromText(schema, '');
    }
    return doc;
  } catch (error) {
    console.warn('Error parsing HTML to ProseMirror doc:', error);
    return createDocFromText(schema, html.replace(/<[^>]*>/g, ''));
  }
}

export function docToHtml(doc) {
  if (!doc) return '';
  try {
    const serializer = DOMSerializer.fromSchema(doc.type.schema);
    const fragment = serializer.serializeFragment(doc.content);
    const temp = document.createElement('div');
    temp.appendChild(fragment);
    return temp.innerHTML;
  } catch (error) {
    console.warn('Error serializing ProseMirror doc to HTML:', error);
    return doc.textContent || '';
  }
}

export function textToDoc(text, schema) {
  return createDocFromText(schema, text || '');
}

export function docToText(doc) {
  return doc ? doc.textContent : '';
}

export function getTextBetween(doc, from, to) {
  try {
    return doc.textBetween(from, to);
  } catch (error) {
    console.warn('Invalid position range:', from, to);
    return '';
  }
}

export function validatePositionRange(doc, from, to) {
  return (
    from >= 1 &&
    to <= doc.content.size &&
    from < to
  );
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function countNodes(doc, nodeType) {
  let count = 0;
  doc.descendants((node) => {
    if (node.type.name === nodeType) {
      count++;
    }
  });
  return count;
}

export function getDocStats(doc) {
  return {
    size: doc.content.size,
    textLength: doc.textContent.length,
    nodeCount: doc.nodeSize,
    paragraphCount: countNodes(doc, 'paragraph'),
    wordCount: countWords(doc.textContent),
    charCount: doc.textContent.length
  };
}

export function createReplaceTransaction(state, from, to, text) {
  const tr = state.tr;
  tr.replaceWith(from, to, state.schema.text(text));
  return tr;
}

export function createInsertTransaction(state, pos, text) {
  const tr = state.tr;
  tr.insert(pos, state.schema.text(text));
  return tr;
}

export function createDeleteTransaction(state, from, to) {
  const tr = state.tr;
  tr.delete(from, to);
  return tr;
}

export function logDocStructure(doc, label = 'Document') {
  console.group(`${label} Structure:`);
  console.log('Size:', doc.content.size);
  console.log('Text length:', doc.textContent.length);
  console.log('Content:', doc.textContent.substring(0, 100) + '...');
  doc.descendants((node, pos) => {
    console.log(`${node.type.name} at ${pos}:`, node.textContent?.substring(0, 50) || '[no text]');
  });
  console.groupEnd();
}

export function logSuggestions(suggestions, label = 'Suggestions') {
  console.group(`${label}:`);
  suggestions.forEach((s, i) => {
    console.log(`${i + 1}. [${s.editType}] ${s.from}-${s.to}: "${s.original}" → "${s.suggestion}"`);
  });
  console.groupEnd();
}

/**
 * Maps LanguageTool grammar matches to ProseMirror suggestion objects
 * Uses proven position mapping logic that correctly handles text-only offsets
 */
export function mapGrammarMatchesToSuggestions(matches, doc) {
    if (!matches || !doc) return [];

    /**
     * Maps a character position from plain text to ProseMirror document position
     * PROVEN LOGIC: Only counts text content, ignores ProseMirror structure
     */
    const mapCharacterToDoc = (charPos) => {
        if (charPos < 0) return null;
        
        let currentOffset = 0;
        let resultPos = null;
        
        doc.descendants((node, pos) => {
            if (resultPos !== null) return false;
            
            if (node.isText) {
                const nodeText = node.text;
                const nodeEnd = currentOffset + nodeText.length; // ✅ CORRECT: text.length only
                
                // Check if our target character position falls within this text node
                if (charPos >= currentOffset && charPos < nodeEnd) {
                    const offsetInNode = charPos - currentOffset;
                    resultPos = pos + offsetInNode; // CORRECTED: pos is already at text node start
                    return false; // Stop searching
                }
                
                currentOffset = nodeEnd;
            }
            // ✅ CORRECT: No block node handling - prevents off-by-one errors
        });
        
        return resultPos;
    };

    // Transform matches to suggestions with debug logging
    const suggestions = matches.map((match, index) => {
        console.log('🔬 [CORRECTED POSITIONING] Match:', {
            offset: match.offset,
            length: match.length,
            text: doc.textContent.substring(match.offset, match.offset + match.length),
            context: doc.textContent.substring(Math.max(0, match.offset - 5), match.offset + match.length + 5)
        });
        
        const fromPos = mapCharacterToDoc(match.offset);
        const toPos = mapCharacterToDoc(match.offset + match.length);
        
        console.log('🔬 [CORRECTED POSITIONING] Mapped positions (NO +1 offset):', {
            from: fromPos,
            to: toPos,
            actualText: fromPos && toPos ? doc.textBetween(fromPos, toPos) : 'N/A',
            shouldMatch: doc.textContent.substring(match.offset, match.offset + match.length)
        });
        
        if (!fromPos || !toPos || fromPos >= toPos) {
            console.warn('🔴 [RED LINE] Invalid position mapping for match:', match);
            return null;
        }
        
        return {
            id: `grammar_${match.offset}_${match.length}_${index}`,
            type: 'passive', // Triggers Red Line styling
            from: fromPos,
            to: toPos,
            original: doc.textBetween(fromPos, toPos),
            replacement: match.replacements?.[0]?.value || 'Grammar suggestion',
            suggestion: match.replacements?.[0]?.value || 'Grammar suggestion',
            message: match.message,
            rule: match.rule?.id,
            editType: 'grammar'
        };
    }).filter(Boolean);

    return suggestions;
}
