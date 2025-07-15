// /utils/prosemirrorHelpers.js

import { DOMParser, DOMSerializer } from "prosemirror-model";

// This function is corrected to use the passed-in schema.
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

// --- NEW: The Bedrock Text Finder ---
// This function replaces the flawed `findTextInDoc`. It searches the document
// and returns true, accurate ProseMirror positions.
export function findPositionOfText(doc, searchText) {
    if (!searchText) return null;
    let result = null;
    doc.descendants((node, pos) => {
        if (result) return false;
        if (node.isText) {
            const index = node.text.indexOf(searchText);
            if (index !== -1) {
                // This logic was confirmed correct by our live test.
                const from = pos + index;
                const to = from + searchText.length;
                result = { from, to };
            }
        }
    });
    return result;
}

// --- Utility functions below are preserved from the original file ---

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