// /editor/setup.js

import { EditorState } from "prosemirror-state";
import { luluSchema } from "../schemas/luluSchema";
import { createDocFromText } from "../utils/prosemirrorHelpers";
import { createCoreSuggestionPlugin } from "../plugins/coreSuggestionPlugin";

export function createLuluEditorState(initialText, options) {
  const { getSuggestions, onHoverStart, onHoverEnd, onClickSuggestion, coyoteTimeMs, debug } = options || {};

  const suggestionPlugin = createCoreSuggestionPlugin({
    getSuggestions,
    onHoverStart,
    onHoverEnd,
    onClickSuggestion,
    coyoteTimeMs,
    debug,
  }).plugin;

  return EditorState.create({
    doc: createDocFromText(luluSchema, initialText),
    plugins: [suggestionPlugin],
  });
}


