// /plugins/suggestionPlugin.js
// FIXED VERSION: Proper separation of text replacement and state management

import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

// Plugin key for suggestion state
export const suggestionPluginKey = new PluginKey('suggestions');

/**
 * BUILT-IN POSITION MAPPER
 * Converts character positions to ProseMirror positions
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
        
        // Check if the character position is within the current paragraph node
        if (charPos <= charCounter + pNodeTextLength) {
            const offsetInP = charPos - charCounter;
            
            let textOffsetInP = 0;
            pNode.descendants((textNode, textNodePos) => {
                if (!textNode.isText) return true; // Continue descending
                if (mappedPos !== -1) return false; // Stop once found

                const textNodeLen = textNode.textContent.length;
                if (offsetInP <= textOffsetInP + textNodeLen) {
                    const offsetInTextNode = offsetInP - textOffsetInP;
                    mappedPos = textNodePos + 1 + offsetInTextNode;
                    return false; // Stop descending
                }
                textOffsetInP += textNodeLen;
            });

            if (mappedPos !== -1) return mappedPos;
        }
        charCounter += pNodeTextLength;
    }
    
    // Handle position at the very end of the document
    if (charPos === charCounter) return doc.content.size;

    return null;
  }

  static validateCharacterRange(doc, startChar, endChar) {
    const startPos = this.mapCharacterToDoc(doc, startChar);
    const endPos = this.mapCharacterToDoc(doc, endChar);

    return {
      isValid: startPos !== null && endPos !== null && startPos <= endPos,
      startPos,
      endPos,
      confidence: startPos !== null && endPos !== null ? 1.0 : 0
    };
  }

  static batchMapPositions(doc, suggestions) {
    return suggestions.map(suggestion => {
      const validation = this.validateCharacterRange(doc, suggestion.start, suggestion.end);
      
      return {
        ...suggestion,
        proseMirrorStart: validation.startPos,
        proseMirrorEnd: validation.endPos,
        isValid: validation.isValid,
        confidence: validation.confidence,
        hasValidOffsets: validation.isValid
      };
    });
  }
}

/**
 * BUILT-IN CONFLICT RESOLVER
 * Handles overlapping suggestions with priority
 */
class ConflictResolver {
  static EDIT_PRIORITY = {
    'Developmental': 5,  // Highest priority
    'Structural': 4,
    'Line': 3,
    'Copy': 2,
    'Proof': 1          // Lowest priority
  };

  static detectOverlaps(suggestions) {
    const conflicts = [];
    const processed = new Set();

    const sortedSuggestions = [...suggestions].sort((a, b) => 
      (a.proseMirrorStart || a.start || 0) - (b.proseMirrorStart || b.start || 0)
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
    const aStart = sugA.proseMirrorStart || sugA.start || 0;
    const aEnd = sugA.proseMirrorEnd || sugA.end || 0;
    const bStart = sugB.proseMirrorStart || sugB.start || 0;
    const bEnd = sugB.proseMirrorEnd || sugB.end || 0;

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
        return priorityB - priorityA; // Higher priority first
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
    let decorations = this.decorations.map(tr.mapping, tr.doc);
    let suggestions = [...this.suggestions];
    
    const action = tr.getMeta(suggestionPluginKey);
    
    if (action) {
      switch (action.type) {
        case 'setSuggestions':
          const result = this.handleSetSuggestions(action, tr.doc);
          decorations = result.decorations;
          suggestions = result.suggestions;
          break;
          
        case 'acceptSuggestion': {
          // ✅ FIXED: Only manage state, don't do text replacement here
          const { suggestionId } = action;
          
          // Remove the accepted suggestion's decoration
          const suggestionToRemove = this.suggestions.find(s => s.id === suggestionId);
          if (suggestionToRemove) {
            const decorationToRemove = this.decorations.find(
              suggestionToRemove.from, 
              suggestionToRemove.to, 
              spec => spec['data-suggestion-id'] === suggestionId
            );
            if (decorationToRemove.length) {
              decorations = this.decorations.remove(decorationToRemove);
            }
          }
          
          // Filter out the accepted suggestion from state
          suggestions = this.suggestions.filter(s => s.id !== suggestionId);

          // Map remaining decorations
          decorations = decorations.map(tr.mapping, tr.doc);
          console.log(`✅ Plugin: Removed suggestion ${suggestionId} from state`);
          break;
        }

        case 'addSuggestion':
          const addResult = this.handleAddSuggestion(action, tr.doc);
          if (addResult) {
            decorations = decorations.add(tr.doc, [addResult.decoration]);
            suggestions.push(addResult.suggestion);
          }
          break;
          
        case 'removeSuggestion':
          const removeResult = this.handleRemoveSuggestion(action, decorations, suggestions);
          decorations = removeResult.decorations;
          suggestions = removeResult.suggestions;
          break;
          
        case 'clearAll':
          decorations = DecorationSet.empty;
          suggestions = [];
          console.log('🧹 Cleared all suggestions');
          break;
      }
    }
    
    // Make sure to map decorations on any transaction
    decorations = decorations.map(tr.mapping, tr.doc);
    
    return new EnhancedSuggestionState(decorations, suggestions);
  }

  handleSetSuggestions(action, doc) {
    console.log('🎯 Processing suggestions with built-in position mapping...');
    
    // Step 1: Map character positions to ProseMirror positions
    console.log('📍 Mapping character positions to ProseMirror positions');
    const mappedSuggestions = PositionMapper.batchMapPositions(doc, action.suggestions);
    
    // Step 2: Filter valid suggestions
    const validSuggestions = mappedSuggestions.filter(suggestion => {
      if (!suggestion.isValid || suggestion.confidence < 0.5) {
        console.warn('⚠️ Filtered out invalid suggestion:', suggestion.original?.substring(0, 30));
        return false;
      }
      return true;
    });
    
    console.log(`✅ Position mapping: ${validSuggestions.length}/${action.suggestions.length} valid`);
    
    // Step 3: Detect and resolve conflicts
    console.log('🔍 Detecting conflicts...');
    const conflicts = ConflictResolver.detectOverlaps(validSuggestions);
    
    let finalSuggestions = validSuggestions;
    if (conflicts.length > 0) {
      console.log(`⚡ Found ${conflicts.length} conflicts, resolving...`);
      const resolution = ConflictResolver.resolveConflicts(conflicts);
      
      finalSuggestions = [
        ...validSuggestions.filter(s => !conflicts.some(c => 
          c.suggestions.some(cs => cs.suggestion.id === s.id)
        )),
        ...resolution.resolvedSuggestions.map(rs => rs.suggestion)
      ];
      
      console.log(`✅ Conflicts resolved: ${finalSuggestions.length} final suggestions`);
    }
    
    // Step 4: Create decorations
    console.log('🎨 Creating decorations...');
    const decorations = [];
    const suggestions = [];
    
    for (const suggestionData of finalSuggestions) {
      // IMPORTANT: Use the ID from the incoming data, not a global counter
      const suggestion = {
        id: suggestionData.id, 
        from: suggestionData.proseMirrorStart,
        to: suggestionData.proseMirrorEnd,
        original: suggestionData.original,
        replacement: suggestionData.suggestion,
        editType: suggestionData.editType || 'Line',
        confidence: suggestionData.confidence
      };
      
      const decoration = Decoration.inline(suggestion.from, suggestion.to, {
        class: `suggestion-highlight ${suggestion.editType.toLowerCase()}`,
        'data-suggestion-id': suggestion.id,
        'data-original': suggestion.original,
        'data-replacement': suggestion.replacement,
        'data-edit-type': suggestion.editType,
        title: `${suggestion.editType}: Click to replace with "${suggestion.replacement}"`
      });
      
      decorations.push(decoration);
      suggestions.push(suggestion);
      
      console.log(`✨ Created ${suggestion.editType} suggestion ${suggestion.id}: "${suggestion.original.substring(0, 30)}..."`);
    }
    
    const decorationSet = DecorationSet.create(doc, decorations);
    
    console.log(`🎉 Processing complete: ${suggestions.length} suggestions with highlighting`);
    
    return {
      decorations: decorationSet,
      suggestions
    };
  }

  handleAddSuggestion(action, doc) {
    const validation = PositionMapper.validateCharacterRange(doc, action.charStart, action.charEnd);
    
    if (!validation.isValid) {
      console.warn('⚠️ Invalid suggestion position:', action);
      return null;
    }
    
    const suggestion = {
      id: action.id || `temp_${Date.now()}`, // Allow external ID or generate temporary one
      from: validation.startPos,
      to: validation.endPos,
      original: action.original,
      replacement: action.replacement,
      editType: action.editType || 'Line'
    };
    
    const decoration = Decoration.inline(suggestion.from, suggestion.to, {
      class: `suggestion-highlight ${suggestion.editType.toLowerCase()}`,
      'data-suggestion-id': suggestion.id,
      'data-original': suggestion.original,
      'data-replacement': suggestion.replacement,
      'data-edit-type': suggestion.editType,
      title: `${suggestion.editType}: Click to replace with "${suggestion.replacement}"`
    });
    
    console.log(`✅ Added ${suggestion.editType} suggestion ${suggestion.id}`);
    
    return { suggestion, decoration };
  }

  handleRemoveSuggestion(action, decorations, suggestions) {
    const targetId = action.id;
    
    const newSuggestions = suggestions.filter(s => String(s.id) !== String(targetId));
    
    const toRemove = decorations.find().filter(dec => 
      String(dec.type?.attrs?.['data-suggestion-id']) === String(targetId)
    );
    
    const newDecorations = decorations.remove(toRemove);
    
    console.log(`🗑️ Removed suggestion ${targetId}`);
    
    return {
      decorations: newDecorations,
      suggestions: newSuggestions
    };
  }
}

/**
 * SUGGESTION PLUGIN FACTORY
 * Creates the plugin with an onAccept callback.
 */
export function createSuggestionPlugin({ onAccept }) {
  return new Plugin({
    key: suggestionPluginKey,
    
    state: {
      init() {
        console.log('🎯 Working suggestion plugin initialized');
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
        const state = suggestionPluginKey.getState(view.state);
        const decorations = state.decorations.find(pos, pos);
        
        if (decorations.length > 0) {
          const decoration = decorations[0];
          const suggestionId = decoration.type.attrs?.['data-suggestion-id'];
          
          if (suggestionId && onAccept) {
            console.log(`🖱️ Clicked suggestion ${suggestionId}, passing to onAccept callback.`);
            onAccept(suggestionId); 
            return true; // Handled
          }
        }
        
        return false;
      }
    }
  });
}

/**
 * HELPER FUNCTIONS - FIXED
 */
// ✅ FIXED: Proper text replacement then state cleanup
export function acceptSuggestion(view, suggestionId) {
  // Get the suggestion before we remove it from state
  const suggestionPlugin = view.state.plugins.find(p => 
    p.key && (p.key.key === 'suggestions' || String(p.key) === 'suggestions$')
  );
  
  if (!suggestionPlugin) {
    console.error('❌ Suggestion plugin not found');
    return;
  }

  const currentState = suggestionPlugin.getState(view.state);
  const suggestion = currentState.suggestions.find(s => s.id === suggestionId);
  
  if (!suggestion) {
    console.warn('⚠️ Suggestion not found:', suggestionId);
    return;
  }

  console.log(`🔧 Accepting suggestion ${suggestionId}: "${suggestion.original}" → "${suggestion.replacement}"`);

  // ✅ FIXED: Do both operations in a single transaction
  const tr = view.state.tr;
  
  // 1. Text replacement
  tr.replaceWith(suggestion.from, suggestion.to, 
    view.state.schema.text(suggestion.replacement));
  
  // 2. Remove from plugin state in same transaction
  tr.setMeta(suggestionPlugin.key, {
    type: 'acceptSuggestion',
    suggestionId
  });
  
  // Dispatch both changes at once
  view.dispatch(tr);
  
  console.log(`✅ Completed suggestion ${suggestionId} (text + state removal)`);

  // 2. THEN: Remove from plugin state in a separate transaction
  setTimeout(() => {
    const removeTr = view.state.tr;
    removeTr.setMeta(suggestionPlugin.key, {
      type: 'acceptSuggestion',
      suggestionId
    });
    view.dispatch(removeTr);
    console.log(`✅ Removed ${suggestionId} from plugin state`);
  }, 10); // Small delay to ensure text replacement is processed first
}

export function setSuggestions(view, suggestions) {
  console.log(`📦 Setting ${suggestions.length} suggestions`);
  
  const suggestionPlugin = view.state.plugins.find(p => 
    p.key && (p.key.key === 'suggestions' || String(p.key) === 'suggestions$')
  );
  
  if (!suggestionPlugin) {
    console.error('❌ Suggestion plugin not found');
    return;
  }
  
  const tr = view.state.tr;
  tr.setMeta(suggestionPlugin.key, {
    type: 'setSuggestions',
    suggestions
  });
  view.dispatch(tr);
}

export function addSuggestion(view, charStart, charEnd, original, replacement, editType = 'Line', id = null) {
  const suggestionPlugin = view.state.plugins.find(p => 
    p.key && (p.key.key === 'suggestions' || String(p.key) === 'suggestions$')
  );
  
  if (!suggestionPlugin) {
    console.error('❌ Suggestion plugin not found');
    return;
  }

  const tr = view.state.tr;
  tr.setMeta(suggestionPlugin.key, {
    type: 'addSuggestion',
    charStart,
    charEnd,
    original,
    replacement,
    editType,
    id
  });
  view.dispatch(tr);
}

export function removeSuggestion(view, id) {
  const suggestionPlugin = view.state.plugins.find(p => 
    p.key && (p.key.key === 'suggestions' || String(p.key) === 'suggestions$')
  );
  
  if (!suggestionPlugin) {
    console.error('❌ Suggestion plugin not found');
    return;
  }

  const tr = view.state.tr;
  tr.setMeta(suggestionPlugin.key, {
    type: 'removeSuggestion',
    id
  });
  view.dispatch(tr);
}

export function clearAllSuggestions(view) {
  const suggestionPlugin = view.state.plugins.find(p => 
    p.key && (p.key.key === 'suggestions' || String(p.key) === 'suggestions$')
  );
  
  if (!suggestionPlugin) {
    console.error('❌ Suggestion plugin not found');
    return;
  }

  const tr = view.state.tr;
  tr.setMeta(suggestionPlugin.key, {
    type: 'clearAll'
  });
  view.dispatch(tr);
}

export function getSuggestions(state) {
  const suggestionPlugin = state.plugins.find(p => 
    p.key && (p.key.key === 'suggestions' || String(p.key) === 'suggestions$')
  );
  
  if (!suggestionPlugin) {
    console.error('❌ Suggestion plugin not found');
    return [];
  }

  return suggestionPlugin.getState(state).suggestions;
}

export default createSuggestionPlugin;