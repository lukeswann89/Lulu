// /utils/prosemirrorHelpers.js

import { DOMParser, DOMSerializer } from "prosemirror-model";

// CORRECTED: Signature is (text, schema) and uses modern ProseMirror API
export function createDocFromText(text, schema) {
  if (!text || typeof text !== 'string') {
    return schema.nodes.doc.create(null, [
      schema.nodes.paragraph.create()
    ]);
  }
  const paragraphs = text.split('\n').map(pText => {
    return schema.nodes.paragraph.create(null, pText ? [schema.text(pText)] : []);
  });
  return schema.nodes.doc.create(null, paragraphs);
}

export function findPositionOfText(doc, searchText) {
  if (!searchText) return null;
  let result = null;
  doc.descendants((node, pos) => {
    if (result) return false;
    if (node.isText) {
      const index = node.text.indexOf(searchText);
      if (index !== -1) {
        const from = pos + index;
        const to = from + searchText.length;
        result = { from, to };
      }
    }
  });
  return result;
}

// CORRECTED: All internal calls to createDocFromText now use (text, schema) order
export function htmlToDoc(html, schema) {
  if (!html || typeof html !== 'string') {
    return createDocFromText('', schema);
  }
  try {
    const temp = document.createElement('div');
    temp.innerHTML = html.trim();
    const parser = DOMParser.fromSchema(schema);
    const doc = parser.parse(temp);
    if (doc.content.size === 0) {
      return createDocFromText('', schema);
    }
    return doc;
  } catch (error) {
    console.warn('Error parsing HTML to ProseMirror doc:', error);
    return createDocFromText(html.replace(/<[^>]*>/g, ''), schema);
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
  return createDocFromText(text || '', schema);
}

export function docToText(doc) {
  return doc ? doc.textContent : '';
}

// ADDED: The missing exported function
export function mapGrammarMatchesToSuggestions(matches, doc) {
  if (!matches || !doc) return [];

  const actionableMatches = matches.filter(match => 
    match.replacements && match.replacements.length > 0 && match.replacements[0].value
  );

  const mapCharacterToDoc = (charPos) => {
    if (charPos < 0) return null;
    let currentOffset = 0;
    let resultPos = null;
    doc.descendants((node, pos) => {
        if (resultPos !== null) return false;
        if (node.isText) {
            const nodeText = node.text;
            const nodeEnd = currentOffset + nodeText.length;
            if (charPos >= currentOffset && charPos < nodeEnd) {
                const offsetInNode = charPos - currentOffset;
                resultPos = pos + offsetInNode;
                return false;
            }
            currentOffset = nodeEnd;
        }
    });
    return resultPos;
  };

  const suggestions = actionableMatches.map((match, index) => {
    const fromPos = mapCharacterToDoc(match.offset);
    const toPos = mapCharacterToDoc(match.offset + match.length);

    if (fromPos === null || toPos === null || fromPos >= toPos) {
      console.warn('🔴 [RED LINE] Invalid position mapping for match:', match);
      return null;
    }

    return {
      id: `grammar_${match.offset}_${match.length}_${index}`,
      type: 'passive',
      from: fromPos,
      to: toPos,
      original: doc.textBetween(fromPos, toPos),
      replacement: match.replacements[0].value,
      suggestion: match.replacements[0].value,
      message: match.message,
      rule: match.rule?.id,
      editType: 'grammar'
    };
  }).filter(Boolean);

  return suggestions;
}