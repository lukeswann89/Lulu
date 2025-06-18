// /schemas/luluSchema.js
// Foundation schema for Lulu ProseMirror editor

import { Schema } from 'prosemirror-model';

// Define node types for document structure
const nodes = {
  doc: {
    content: "paragraph+"
  },
  
  paragraph: {
    content: "inline*",
    group: "block",
    parseDOM: [{ tag: "p" }],
    toDOM() { return ["p", 0]; }
  },
  
  text: {
    group: "inline"
  }
};

// Define marks for styling and suggestions
const marks = {
  // Core suggestion mark for highlighting
  suggestion: {
    attrs: {
      id: { default: null },
      type: { default: "suggestion" },
      original: { default: "" },
      replacement: { default: "" }
    },
    parseDOM: [{
      tag: "span[data-suggestion-id]",
      getAttrs: dom => ({
        id: dom.getAttribute("data-suggestion-id"),
        type: dom.getAttribute("data-suggestion-type") || "suggestion",
        original: dom.getAttribute("data-original") || "",
        replacement: dom.getAttribute("data-replacement") || ""
      })
    }],
    toDOM: mark => [
      "span",
      {
        class: `lulu-suggestion lulu-${mark.attrs.type}`,
        "data-suggestion-id": mark.attrs.id,
        "data-suggestion-type": mark.attrs.type,
        "data-original": mark.attrs.original,
        "data-replacement": mark.attrs.replacement,
        title: `Click to replace with: "${mark.attrs.replacement}"`
      },
      0
    ]
  }
};

// Create and export the schema
export const luluSchema = new Schema({ nodes, marks });

// Schema utilities
export function createSuggestionMark(id, type, original, replacement) {
  return luluSchema.marks.suggestion.create({
    id: String(id),
    type,
    original,
    replacement
  });
}

export function findSuggestionMarks(doc, pos) {
  const resolved = doc.resolve(pos);
  return resolved.marks().filter(mark => mark.type === luluSchema.marks.suggestion);
}

export default luluSchema;