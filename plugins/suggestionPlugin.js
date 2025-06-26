import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

// Plugin key for suggestion state
export const suggestionPluginKey = new PluginKey('suggestions');

/**
 * BUILT-IN POSITION MAPPER
 */
class PositionMapper {
  static mapCharacterToDoc(doc, charPos) {
    if (charPos < 0) return null;
    let mappedPos = -1;
    let charCounter = 0;

    for (let i = 0; i < doc.childCount; i++) {
        const pNode = doc.child(i);
        if (i > 0) charCounter++; // Account for newline separator

        const pNodeTextLength = pNode.textContent.length;
        
        if (charPos <= charCounter + pNodeTextLength) {
            const offsetInP = charPos - charCounter;
            
            let textOffsetInP = 0;
            pNode.descendants((textNode, textNodePos) => {
                if (!textNode.isText) return true;
                if (mappedPos !== -1) return false;

                const textNodeLen = textNode.textContent.length;
                if (offsetInP <= textOffsetInP + textNodeLen) {
                    const offsetInTextNode = offsetInP - textOffsetInP;
                    mappedPos = textNodePos + 1 + offsetInTextNode;
                    return false;
                }
                textOffsetInP += textNodeLen;
            });

            if (mappedPos !== -1) return mappedPos;
        }
        charCounter += pNodeTextLength;
    }
    
    if (charPos === charCounter) return doc.content.size;
    return null;
  }

  static validateCharacterRange(doc, startChar, endChar) {
    const startPos = this.mapCharacterToDoc(doc, startChar);
    const endPos = this.mapCharacterToDoc(doc, endChar);

    return {
      isValid: startPos !== null && endPos !== null && startPos < endPos,
      startPos,
      endPos,
    };
  }

  static batchMapPositions(doc, suggestions) {
    return suggestions.map(suggestion => {
      const validation = this.validateCharacterRange(doc, suggestion.start, suggestion.end);
      return { ...suggestion, proseMirrorStart: validation.startPos, proseMirrorEnd: validation.endPos, isValid: validation.isValid };
    });
  }
}

/**
 * BUILT-IN CONFLICT RESOLVER
 */
class ConflictResolver {
  static EDIT_PRIORITY = {
    'Developmental': 5,
    'Structural': 4,
    'Line': 3,
    'Copy': 2,
    'Proof': 1
  };

  static detectOverlaps(suggestions) {
    const conflicts = [];
    const processed = new Set();

    const sortedSuggestions = [...suggestions].sort((a, b) => 
      (a.from || 0) - (b.from || 0)
    );

    for (let i = 0; i < sortedSuggestions.length; i++) {
      if (processed.has(i)) continue;

      const suggestion = sortedSuggestions[i];
      const conflictGroup = [{ suggestion, index: i }];
      processed.add(i);

      for (let j = i + 1; j < sortedSuggestions.length; j++) {
        if (processed.has(j)) continue;
        const otherSuggestion = sortedSuggestions[j];
        if (this.doSuggestionsOverlap(suggestion, otherSuggestion)) {
          conflictGroup.push({ suggestion: otherSuggestion, index: j });
          processed.add(j);
        }
      }

      if (conflictGroup.length > 1) {
        conflicts.push({
          type: 'overlap',
          suggestions: conflictGroup
        });
        }
    }
    return conflicts;
  }

  static doSuggestionsOverlap(sugA, sugB) {
    // FIX: Use 'from' and 'to', which is what the suggestion objects actually have.
    const aStart = sugA.from || 0;
    const aEnd = sugA.to || 0;
    const bStart = sugB.from || 0;
    const bEnd = sugB.to || 0;

    // The actual overlap logic remains the same.
    return !(aEnd <= bStart || bEnd <= aStart);
  }

  static resolveConflicts(conflicts) {
    const result = {
      resolvedSuggestions: [],
      invalidatedSuggestions: []
    };
    for (const conflict of conflicts) {
      const winner = this.resolveByCasualPriority(conflict.suggestions);
      result.resolvedSuggestions.push(...winner);
    }
    return result;
  }

  static resolveByCasualPriority(suggestions) {
    const prioritized = suggestions.sort((a, b) => {
      const priorityA = this.EDIT_PRIORITY[a.suggestion.editType] || 0;
      const priorityB = this.EDIT_PRIORITY[b.suggestion.editType] || 0;
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      const confA = a.suggestion.confidence || 0;
      const confB = b.suggestion.confidence || 0;
      return confB - confA;
    });
    return [prioritized[0]];
  }

  static getPriority(editType) {
    return this.EDIT_PRIORITY[editType] || 0;
  }
}

/**
 * ENHANCED SUGGESTION STATE
 */
class EnhancedSuggestionState {
  constructor(decorations = DecorationSet.empty, suggestions = []) {
    this.decorations = decorations;
    this.suggestions = suggestions;
  }

  apply(tr) {
    let suggestions = this.suggestions.map(s => ({
      ...s,
      from: tr.mapping.map(s.from),
      to: tr.mapping.map(s.to),
    }));
    let decorations = this.decorations.map(tr.mapping, tr.doc);

    const action = tr.getMeta(suggestionPluginKey);

    if (action) {
      switch (action.type) {
        case 'setSuggestions':
          const result = this.handleSetSuggestions(action, tr.doc);
          decorations = result.decorations;
          suggestions = result.suggestions;
          break;
          
        case 'acceptSuggestion': {
          const { suggestionId } = action;
          
          const decoToRemove = decorations.find().find(d => 
            String(d.type.attrs['data-suggestion-id']) === String(suggestionId)
          );
          
          if (decoToRemove) {
            decorations = decorations.remove([decoToRemove]);
          }
          
          suggestions = suggestions.filter(s => s.id !== suggestionId);
          
          console.log(`✅ Plugin: Removed suggestion ${suggestionId} from state`);
          break;
        }

        case 'addSuggestion': {
          const addResult = this.handleAddSuggestion(action, tr.doc);
          if (!addResult) break;

          const currentSuggestions = [...suggestions, addResult.suggestion];

          const conflicts = ConflictResolver.detectOverlaps(currentSuggestions);
          
          let finalSuggestions = currentSuggestions;
          if (conflicts.length > 0) {
            console.log(`⚡ Found ${conflicts.length} conflicts while adding, resolving...`);
            
            const nonConflicting = currentSuggestions.filter(s => 
              !conflicts.some(c => c.suggestions.some(cs => cs.suggestion.id === s.id))
            );
            const resolution = ConflictResolver.resolveConflicts(conflicts);
            const resolved = resolution.resolvedSuggestions.map(rs => rs.suggestion);
            finalSuggestions = [...nonConflicting, ...resolved];
          }
          
          const finalDecorations = finalSuggestions.map(sug => {
            return Decoration.inline(sug.from, sug.to, {
              class: `suggestion-highlight ${sug.editType.toLowerCase()}`,
              'data-suggestion-id': sug.id,
              title: `Click to replace with "${sug.replacement}"`
            });
          });

          decorations = DecorationSet.create(tr.doc, finalDecorations);
          suggestions = finalSuggestions;
          break;
        }
        
        case 'clearAll':
          decorations = DecorationSet.empty;
          suggestions = [];
          console.log('🧹 Cleared all suggestions');
          break;
      }
    }
    
    return new EnhancedSuggestionState(decorations, suggestions);
  }

  handleSetSuggestions(action, doc) {
    const mappedSuggestions = PositionMapper.batchMapPositions(doc, action.suggestions);
    const validSuggestions = mappedSuggestions.filter(s => s.isValid);
    
    const decorations = [];
    const suggestions = [];
    
    for (const suggestionData of validSuggestions) {
      const from = suggestionData.proseMirrorStart;
      const to = suggestionData.proseMirrorEnd;

      const originalText = doc.textBetween(from, to);

      const suggestion = {
        id: suggestionData.id, 
        from,
        to,
        original: originalText,
        replacement: suggestionData.suggestion,
        editType: suggestionData.editType || 'Line',
      };
      
      const decoration = Decoration.inline(from, to, {
        class: `suggestion-highlight ${suggestion.editType.toLowerCase()}`,
        'data-suggestion-id': suggestion.id,
        title: `Click to replace with "${suggestion.replacement}"`
      });
      
      decorations.push(decoration);
      suggestions.push(suggestion);
    }
    
    const decorationSet = DecorationSet.create(doc, decorations);
    
    return { decorations: decorationSet, suggestions };
  }

  handleAddSuggestion(action, doc) {
    const validation = PositionMapper.validateCharacterRange(doc, action.charStart, action.charEnd);
    
    if (!validation.isValid) return null;
    
    const originalText = doc.textBetween(validation.startPos, validation.endPos);

    const suggestion = {
      id: action.id || `temp_${Date.now()}`,
      from: validation.startPos,
      to: validation.endPos,
      original: originalText, 
      replacement: action.replacement,
      editType: action.editType || 'Line'
    };
    
    const decoration = Decoration.inline(suggestion.from, suggestion.to, {
      class: `suggestion-highlight ${suggestion.editType.toLowerCase()}`,
      'data-suggestion-id': suggestion.id,
      title: `${suggestion.editType}: Click to replace with "${suggestion.replacement}"`
    });
    
    return { suggestion, decoration };
  }
}

/**
 * SUGGESTION PLUGIN FACTORY
 */
export function createSuggestionPlugin({ onAccept }) {
  return new Plugin({
    key: suggestionPluginKey,
    state: {
      init() {
        return new EnhancedSuggestionState();
      },
      apply(tr, state) {
        return state.apply(tr);
      }
    },
    props: {
      decorations(state) {
        return suggestionPluginKey.getState(state).decorations;
      },
      handleClick(view, pos, event) {
        const target = event.target;
        if (target.matches('.suggestion-highlight')) {
          const suggestionId = target.getAttribute('data-suggestion-id');
          if (suggestionId && onAccept) {
            console.log(`🖱️ Clicked suggestion ${suggestionId}, passing to onAccept callback.`);
            onAccept(suggestionId);
            return true;
          }
        }
        return false;
      }
    }
  });
}

/**
 * HELPER FUNCTIONS
 */
export function acceptSuggestion(view, suggestionId) {
    const pluginState = suggestionPluginKey.getState(view.state);
    if (!pluginState) return console.error('❌ Suggestion plugin state not found');
  
    const suggestion = pluginState.suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return console.warn('⚠️ Suggestion not found in state:', suggestionId);
  
    console.log(`🔧 Accepting suggestion ${suggestionId}: "${suggestion.original}" → "${suggestion.replacement}"`);
  
    let replacementText = suggestion.replacement || '';
    const originalText = suggestion.original;
  
    if (originalText.length > 0 && replacementText.length > 0) {
      const isOriginalCapitalized = originalText[0] === originalText[0].toUpperCase();
      const isOriginalAllUppercase = originalText === originalText.toUpperCase();
  
      if (isOriginalAllUppercase) {
        replacementText = replacementText.toUpperCase();
      } else if (isOriginalCapitalized) {
        replacementText = replacementText[0].toUpperCase() + replacementText.slice(1);
      } else {
        replacementText = replacementText[0].toLowerCase() + replacementText.slice(1);
      }
    }
  
    const tr = view.state.tr;
  
    tr.replaceWith(suggestion.from, suggestion.to, view.state.schema.text(replacementText));
    
    tr.setMeta(suggestionPluginKey, {
      type: 'acceptSuggestion',
      suggestionId
    });
    
    view.dispatch(tr);
    console.log(`✅ Dispatched transaction for suggestion ${suggestionId}`);
  }

export function setSuggestions(view, suggestions) {
  const tr = view.state.tr;
  tr.setMeta(suggestionPluginKey, { type: 'setSuggestions', suggestions });
  view.dispatch(tr);
}

export function addSuggestion(view, charStart, charEnd, original, replacement, editType = 'Line', id = null) {
  const tr = view.state.tr;
  tr.setMeta(suggestionPluginKey, { type: 'addSuggestion', charStart, charEnd, original, replacement, editType, id });
  view.dispatch(tr);
}

export function clearAllSuggestions(view) {
  const tr = view.state.tr;
  tr.setMeta(suggestionPluginKey, { type: 'clearAll' });
  view.dispatch(tr);
}

export function getSuggestions(state) {
  const pluginState = suggestionPluginKey.getState(state);
  return pluginState ? pluginState.suggestions : [];
}

export default createSuggestionPlugin;