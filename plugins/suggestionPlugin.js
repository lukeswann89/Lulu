// /plugins/suggestionPlugin.js
// WORKING VERSION: All-in-one with built-in position mapping and conflict resolution

import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

// Plugin key for suggestion state
export const suggestionPluginKey = new PluginKey('suggestions');

// Global ID counter for unique suggestion tracking
let globalSuggestionId = 1;

/**
 * BUILT-IN POSITION MAPPER
 * Converts character positions to ProseMirror positions
 */
class PositionMapper {
  static mapCharacterToDoc(doc, charPos) {
    if (charPos < 0) return null;
    
    let currentChar = 0;
    let result = null;

    doc.descendants((node, pos) => {
      if (result !== null) return false; // Early exit when found

      if (node.isText) {
        const nodeStart = currentChar;
        const nodeEnd = currentChar + node.textContent.length;

        // Character position is within this text node
        if (charPos >= nodeStart && charPos <= nodeEnd) {
          const offsetInNode = charPos - nodeStart;
          result = pos + 1 + offsetInNode; // +1 for node boundary
          return false; // Stop traversal
        }

        currentChar = nodeEnd;
      }
    });

    // Handle end-of-document position
    if (result === null && charPos === currentChar) {
      result = doc.content.size;
    }

    return result;
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
          globalSuggestionId = 1;
          console.log('🧹 Cleared all suggestions');
          break;
      }
    }
    
    return new EnhancedSuggestionState(decorations, suggestions);
  }

  handleSetSuggestions(action, doc) {
    console.log('🎯 Processing suggestions with built-in position mapping...');
    
    // Reset state
    globalSuggestionId = 1;
    
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
      const suggestion = {
        id: globalSuggestionId++,
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
      id: globalSuggestionId++,
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
    
    const newSuggestions = suggestions.filter(s => s.id !== targetId);
    
    const toRemove = decorations.find().filter(dec => 
      dec.type?.attrs?.['data-suggestion-id'] == targetId
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
 * SUGGESTION PLUGIN
 */
export const suggestionPlugin = new Plugin({
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
        const original = decoration.type.attrs?.['data-original'];
        const replacement = decoration.type.attrs?.['data-replacement'];
        const editType = decoration.type.attrs?.['data-edit-type'];
        
        if (suggestionId && replacement) {
          console.log(`🖱️ Clicked ${editType} suggestion ${suggestionId}: "${original}" → "${replacement}"`);
          
          const from = decoration.from;
          const to = decoration.to;
          
          const tr = view.state.tr;
          tr.replaceWith(from, to, view.state.schema.text(replacement));
          
          tr.setMeta(suggestionPluginKey, {
            type: 'removeSuggestion',
            id: parseInt(suggestionId)
          });
          
          view.dispatch(tr);
          
          console.log(`🔄 Replacement completed`);
          return true;
        }
      }
      
      return false;
    }
  }
});

/**
 * HELPER FUNCTIONS
 */
export function setSuggestions(view, suggestions) {
  console.log(`📦 Setting ${suggestions.length} suggestions`);
  
  const tr = view.state.tr;
  tr.setMeta(suggestionPluginKey, {
    type: 'setSuggestions',
    suggestions
  });
  view.dispatch(tr);
}

export function addSuggestion(view, charStart, charEnd, original, replacement, editType = 'Line') {
  const tr = view.state.tr;
  tr.setMeta(suggestionPluginKey, {
    type: 'addSuggestion',
    charStart,
    charEnd,
    original,
    replacement,
    editType
  });
  view.dispatch(tr);
}

export function removeSuggestion(view, id) {
  const tr = view.state.tr;
  tr.setMeta(suggestionPluginKey, {
    type: 'removeSuggestion',
    id
  });
  view.dispatch(tr);
}

export function clearAllSuggestions(view) {
  const tr = view.state.tr;
  tr.setMeta(suggestionPluginKey, {
    type: 'clearAll'
  });
  view.dispatch(tr);
}

export function getSuggestions(state) {
  return suggestionPluginKey.getState(state).suggestions;
}

export default suggestionPlugin;

// Add to your existing PositionMapper class
class OptimizedPositionMapper extends PositionMapper {
  constructor() {
    super();
    this.cache = new Map();
    this.cacheSize = 1000;
  }

  static mapCharacterToDoc(doc, charPos) {
    const cacheKey = `${doc.content.size}_${charPos}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const result = super.mapCharacterToDoc(doc, charPos);
    
    if (this.cache.size < this.cacheSize) {
      this.cache.set(cacheKey, result);
    }
    
    return result;
  }
}