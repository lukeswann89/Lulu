// /plugins/coresuggestionPlugin.js
// The foundational plugin for Lulu's editor.
// This version introduces the "conscience": the ability to handle conflicting
// suggestions by presenting choices rather than silently discarding options.

import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { generateSuggestionId, createSuggestionMetadata } from '../utils/suggestionIdGenerator.js';

// LULU'S CONSCIENCE: We create a new, more explicit key for our core plugin.
export const coreSuggestionPluginKey = new PluginKey('coreSuggestions');

// --- CHANGED: START ---
// The entire 'EnhancedPositionMapper' class has been replaced with this more robust 'PositionMapper'.
// This logic is proven to handle single-paragraph documents correctly.
class PositionMapper {
    static mapCharacterToDoc(doc, charPos) {
        if (charPos < 0) return null;

        let accumulatedChars = 0;
        let resultPos = null;

        doc.descendants((node, pos) => {
            if (resultPos !== null) {
                return false; // Stop searching once we've found the position
            }

            if (node.isText) {
                const nodeSize = node.nodeSize;
                if (charPos <= accumulatedChars + nodeSize) {
                    // The position is within this text node
                    const offset = charPos - accumulatedChars;
                    resultPos = pos + 1 + offset; // +1 to enter the node
                }
                accumulatedChars += nodeSize;
            } else if (node.isBlock && pos > 0) {
                // For block nodes (like paragraphs), count the "invisible" character for the tag
                accumulatedChars += 1;
            }
        });

        return resultPos;
    }

    static validateCharacterRange(doc, startChar, endChar) {
        const startPos = this.mapCharacterToDoc(doc, startChar);
        const endPos = this.mapCharacterToDoc(doc, endChar);
        const isValid = startPos !== null && endPos !== null && startPos < endPos && startPos >= 1 && endPos <= doc.content.size;
        
        return {
            isValid,
            startPos,
            endPos,
            error: !isValid ? `Invalid character range mapping (${startChar}, ${endChar}) -> (${startPos}, ${endPos})` : null
        };
    }

    static batchMapPositions(doc, suggestions) {
        return suggestions.map(suggestion => {
            const validation = this.validateCharacterRange(doc, suggestion.start, suggestion.end);
                // [AUDIT-WILL] Plugin Received Suggestions:
                console.log('[AUDIT-WILL] Plugin Received Suggestions:', JSON.stringify(suggestion));
            return {
                ...suggestion,
                proseMirrorStart: validation.startPos,
                proseMirrorEnd: validation.endPos,
                isValid: validation.isValid,
                validationError: validation.error,
            };
        });
    }
}
// --- CHANGED: END ---


/**
 * LULU'S CONSCIENCE: THE NEW CONFLICT HANDLER
 * This class no longer "resolves" conflicts by picking a winner.
 * It now "groups" conflicts so they can be presented to the user.
 */
class ConflictGrouper {
    /**
     * Detects overlaps and groups suggestions together.
     * @param {Array} suggestions - An array of individual suggestion objects.
     * @returns {Array} An array containing a mix of individual suggestions and "conflict group" objects.
     */
    static groupOverlaps(suggestions) {
        if (suggestions.length < 2) {
            return suggestions;
        }

        const sorted = [...suggestions].sort((a, b) => a.from - b.from);
        const final_suggestions = [];
        let current_group = [sorted[0]];

        for (let i = 1; i < sorted.length; i++) {
            const last_in_group = current_group[current_group.length - 1];
            const current_suggestion = sorted[i];

            // Check for overlap: if the current suggestion starts before the last one ends.
            if (current_suggestion.from < last_in_group.to) {
                current_group.push(current_suggestion);
            } else {
                // No overlap, so the current group is finished.
                // If it has more than one suggestion, it's a conflict. Otherwise, it's just an individual suggestion.
                if (current_group.length > 1) {
                    final_suggestions.push(this.createConflictGroup(current_group));
                } else {
                    final_suggestions.push(current_group[0]);
                }
                // Start a new group with the current suggestion.
                current_group = [current_suggestion];
            }
        }

        // Handle the last group
        if (current_group.length > 1) {
            final_suggestions.push(this.createConflictGroup(current_group));
        } else {
            final_suggestions.push(current_group[0]);
        }

        return final_suggestions;
    }

    /**
     * Creates a special "conflict group" object.
     * @param {Array} conflictingSuggestions - The suggestions that overlap.
     * @returns {Object} A single object representing the conflict.
     */
    static createConflictGroup(conflictingSuggestions) {
        const from = Math.min(...conflictingSuggestions.map(s => s.from));
        const to = Math.max(...conflictingSuggestions.map(s => s.to));
        const groupId = `conflict_${from}_${to}_${Date.now()}`;

        console.log(`✨ Conscience: Identified a creative crossroads. Grouping ${conflictingSuggestions.length} suggestions into group ${groupId}.`);

        return {
            id: groupId,
            isConflictGroup: true,
            suggestions: conflictingSuggestions,
            from,
            to,
            original: `Conflict over text from position ${from} to ${to}`, // Placeholder original text
            replacement: 'User choice required',
            editType: 'Conflict'
        };
    }
}


/**
 * LULU'S CONSCIENCE: THE NEW SUGGESTION STATE
 * This state now understands the difference between a single suggestion
 * and a "conflict group" that requires a user's choice.
 */
class CoreSuggestionState {
    constructor(decorations = DecorationSet.empty, suggestions = [], activeConflict = null, metadata = {}) {
        this.decorations = decorations;
        this.suggestions = suggestions; // This can now contain both normal suggestions and conflict groups
        this.activeConflict = activeConflict; // Holds the conflict group the user is currently viewing
        this.metadata = {
            lastUpdated: Date.now(),
            ...metadata
        };
    }

    apply(tr) {
        // Document state validation - catch corruption early
        if (!tr.doc || typeof tr.doc.nodeSize !== 'number') {
            console.error('🚨 [PLUGIN] Document corruption detected - invalid doc state');
            return new CoreSuggestionState(DecorationSet.empty, [], null, this.metadata);
        }

        const action = tr.getMeta(coreSuggestionPluginKey);
        let suggestions = [...this.suggestions];
        let decorations = this.decorations;
        let activeConflict = this.activeConflict;

        // Handle plugin actions first (before position mapping)
        if (action) {
            switch (action.type) {
                case 'setSuggestions':
                    // setSuggestions provides fresh data with correct positions
                    const result = this.handleSetSuggestions(action, tr.doc);
                    decorations = result.decorations;
                    suggestions = result.suggestions;
                    // setSuggestions provides fresh positions - return immediately to avoid double mapping
                    return new CoreSuggestionState(decorations, suggestions, activeConflict, this.metadata);

                case 'showConflict':
                    activeConflict = suggestions.find(s => s.id === action.groupId);
                    console.log(`💡 Conscience: User is examining conflict group ${action.groupId}.`);
                    break;
                
                case 'hideConflict':
                    activeConflict = null;
                    break;

                case 'acceptSuggestion':
                    const acceptResult = this.handleAcceptSuggestion(action, decorations, suggestions, tr);
                    decorations = acceptResult.decorations;
                    suggestions = acceptResult.suggestions;
                    activeConflict = null;
                    // Don't return early - let position mapping execute for remaining suggestions
                    break;

                case 'clearAll':
                    decorations = DecorationSet.empty;
                    suggestions = [];
                    activeConflict = null;
                    // No suggestions to map - return immediately
                    return new CoreSuggestionState(decorations, suggestions, activeConflict, this.metadata);
            }
        }

        // Only map positions if document changed AND no action handled suggestions
        if (tr.docChanged && suggestions.length > 0) {
            try {
                // Validate and map positions with bounds checking
                suggestions = suggestions.map(s => {
                    const newFrom = tr.mapping.map(s.from);
                    const newTo = tr.mapping.map(s.to);
                    
                    // Validate mapped positions are within document bounds
                    if (newFrom >= 0 && newTo <= tr.doc.nodeSize && newFrom <= newTo) {
                        return { ...s, from: newFrom, to: newTo };
                    } else {
                        console.warn(`🚨 [PLUGIN] Invalid position mapping for suggestion ${s.id}: ${s.from}-${s.to} → ${newFrom}-${newTo}`);
                        return null; // Mark for removal
                    }
                }).filter(Boolean); // Remove invalid suggestions

                decorations = decorations.map(tr.mapping, tr.doc);
                console.log(`🔧 [PLUGIN] Mapped ${suggestions.length} suggestions through document change`);
            } catch (error) {
                console.error('🚨 [PLUGIN] Position mapping failed:', error);
                // On mapping failure, clear suggestions to prevent corruption
                suggestions = [];
                decorations = DecorationSet.empty;
            }
        }

        return new CoreSuggestionState(decorations, suggestions, activeConflict, this.metadata);
    }

    handleSetSuggestions(action, doc) {
        console.log('🔧 [HANDLE_SET] Received action:', action);
        console.log('🔧 [HANDLE_SET] Suggestions:', action.suggestions);
        console.log('🔧 [HANDLE_SET] Number of suggestions:', action.suggestions?.length || 0);
        
        // CANONICAL ID SYSTEM: Preserve exact suggestion objects from React with their canonical IDs
        const validSuggestions = action.suggestions.filter(s => s.from && s.to);
        console.log('🔧 [HANDLE_SET] Valid suggestions after filtering:', validSuggestions.length);

        const suggestionsWithOriginals = validSuggestions.map(s => {
            // Extract original text from document for display purposes
            const originalText = doc.textBetween(s.from, s.to);
            
            // CRITICAL CHANGE: Use canonical ID from React - DO NOT generate fallback IDs
            // The suggestion object must be preserved exactly as received from React
            return {
                ...s, // Preserve all properties from React, including canonical ID
                original: originalText, // Add extracted original text
                replacement: s.suggestion || s.replacement, // Normalize replacement text
            };
        });

        const groupedSuggestions = ConflictGrouper.groupOverlaps(suggestionsWithOriginals);
        console.log('🔧 [HANDLE_SET] Grouped suggestions:', groupedSuggestions);
        console.log('🔧 [HANDLE_SET] About to create decorations for', groupedSuggestions.length, 'suggestions');

        const newDecorations = groupedSuggestions.map(s => {
            if (s.isConflictGroup) {
                return Decoration.inline(s.from, s.to, {
                    class: 'suggestion-highlight conflict-highlight',
                    'data-conflict-group-id': s.id
                });
            } else {
                // --- ARCHITECT'S NOTE: This logic now handles both Active and Passive suggestion types ---
                let suggestionClass = '';
                console.log('🛠️ [PLUGIN] Processing suggestion:', s.id, 'type:', s.type, 'editType:', s.editType);
                
                if (s.type === 'passive') {
                    suggestionClass = 'passive'; // Use our new 'Red Line' style
                    console.log('🛠️ [PLUGIN] Applied PASSIVE class to suggestion:', s.id);
                } else {
                    // Fallback for our existing Active suggestions
                    suggestionClass = (s.editType || 'substantive').toLowerCase();
                    console.log('🛠️ [PLUGIN] Applied class:', suggestionClass, 'to suggestion:', s.id);
                }
                
                const displayType = s.editType || 'Substantive';
                const finalClass = `suggestion-highlight ${suggestionClass}`;
                console.log('🛠️ [PLUGIN] Final CSS class:', finalClass);
                
                return Decoration.inline(s.from, s.to, {
                    class: finalClass,
                    'data-suggestion-id': s.id
                });
            }
        });

        return {
            decorations: DecorationSet.create(doc, newDecorations),
            suggestions: groupedSuggestions,
        };
    }

    handleAcceptSuggestion(action, decorations, suggestions, tr) {
        const { suggestionId } = action;
        
        console.log(`🔧 [PLUGIN] handleAcceptSuggestion: ${suggestionId}`);
        console.log(`🔧 [PLUGIN] Input suggestions count: ${suggestions.length}`);
        console.log(`🔧 [PLUGIN] Input decorations count: ${decorations.find().length}`);

        const decoToRemove = decorations.find().find(d => {
            const acceptedSuggestionInGroup = suggestions.find(s => s.isConflictGroup && s.suggestions.some(child => child.id === suggestionId));
            if (acceptedSuggestionInGroup) {
                return d.type.attrs['data-conflict-group-id'] === acceptedSuggestionInGroup.id;
            }
            return String(d.type.attrs['data-suggestion-id']) === String(suggestionId);
        });

        let newDecorations = decorations;
        if (decoToRemove) {
            newDecorations = decorations.remove([decoToRemove]);
            console.log(`🔧 [PLUGIN] Removed decoration for suggestion ${suggestionId}`);
        } else {
            console.warn(`⚠️ [PLUGIN] No decoration found for suggestion ${suggestionId}`);
        }

        // Filter out accepted suggestion - positions handled by apply() method
        const newSuggestions = suggestions.filter(s => {
            if (s.isConflictGroup) {
                return !s.suggestions.some(child => child.id === suggestionId);
            }
            return s.id !== suggestionId;
        });

        console.log(`🔧 [PLUGIN] Filtered ${newSuggestions.length} remaining suggestions after accepting ${suggestionId}`);
        
        // Log remaining suggestion positions for debugging
        if (newSuggestions.length > 0) {
            const positionMap = newSuggestions.slice(0, 3).map(s => `${s.id}:${s.from}-${s.to}`);
            console.log(`🔧 [PLUGIN] Sample remaining positions: ${positionMap.join(', ')}`);
        }

        return {
            decorations: newDecorations,
            suggestions: newSuggestions,
        };
    }
}

/**
 * LULU'S CONSCIENCE: THE NEW PLUGIN FACTORY
 * This creates the ProseMirror plugin with the new conscience built-in.
 * It now has logic to differentiate between a click on a single suggestion
 * and a click on a creative crossroads (a conflict group).
 */
export function createCoreSuggestionPlugin({ onAccept, onConflictClick }) {
    // --- NOTE: Your debug code is still here, which is correct for now. ---
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        window.LuluDebug = {
            PositionMapper,
            ConflictGrouper
        };
        console.log("🛠️ Lulu Debug Interface Attached.");
    }

    return new Plugin({
        key: coreSuggestionPluginKey,
        state: {
            init() {
                console.log("🧠 Lulu's Conscience Initialized.");
                return new CoreSuggestionState();
            },
            apply(tr, state) {
                console.log('🔧 [PLUGIN APPLY] Transaction received');
                console.log('🔧 [PLUGIN APPLY] Has meta data:', !!tr.getMeta(coreSuggestionPluginKey));
                const meta = tr.getMeta(coreSuggestionPluginKey);
                if (meta) {
                    console.log('🔧 [PLUGIN APPLY] Meta type:', meta.type);
                    console.log('🔧 [PLUGIN APPLY] Meta data:', meta);
                }
                return state.apply(tr);
            }
        },
        props: {
            decorations(state) {
                return coreSuggestionPluginKey.getState(state).decorations;
            },
            handleClick(view, pos, event) {
                const target = event.target;
                if (target.matches('.suggestion-highlight')) {
                    // SURGICAL FIX: Skip passive suggestions - they're handled by React useEffect
                    if (target.classList.contains('passive')) {
                        console.log("� [ARCHITECTURAL FIX] ProseMirror skipping passive suggestion - React handles this");
                        return false; // Let React useEffect handle passive suggestions
                    }
                    
                    const conflictGroupId = target.getAttribute('data-conflict-group-id');
                    const suggestionId = target.getAttribute('data-suggestion-id');

                    if (conflictGroupId) {
                        console.log(`🌟 Creative crossroads clicked: ${conflictGroupId}`);
                        if (onConflictClick) {
                            const state = coreSuggestionPluginKey.getState(view.state);
                            const conflictGroup = state.suggestions.find(s => s.id === conflictGroupId);
                            if (conflictGroup) {
                                onConflictClick(conflictGroup);
                            }
                        }
                        return true;
                    }

                    if (suggestionId) {
                        if (onAccept) {
                            onAccept(suggestionId);
                        }
                        return true;
                    }
                }
                return false;
            },
        },
    });
}

/**
 * HELPER FUNCTIONS (Public API for interacting with the plugin)
 */

export function setSuggestions(view, suggestions) {
    console.log('🔧 [SET_SUGGESTIONS] Entry point hit with:', suggestions?.length || 0, 'suggestions');
    console.log('🔧 [SET_SUGGESTIONS] View state valid:', !!view?.state);
    console.log('🔧 [SET_SUGGESTIONS] Plugin key:', coreSuggestionPluginKey);
    console.log('🔧 [SET_SUGGESTIONS] Suggestions array:', suggestions);
    console.log('🔧 [SET_SUGGESTIONS] First suggestion detailed:', suggestions?.[0]);
    
    if (!view || !view.state) {
        console.error('🔧 [SET_SUGGESTIONS] ERROR: Invalid view or view.state');
        return;
    }
    
    const tr = view.state.tr.setMeta(coreSuggestionPluginKey, {
        type: 'setSuggestions',
        suggestions
    });
    
    console.log('🔧 [SET_SUGGESTIONS] Transaction created, dispatching...');
    view.dispatch(tr);
    console.log('🔧 [SET_SUGGESTIONS] Transaction dispatched successfully');
}

export function acceptSuggestion(view, suggestionId) {
    const pluginState = coreSuggestionPluginKey.getState(view.state);
    if (!pluginState) return;

    let suggestionToAccept = null;
    for (const item of pluginState.suggestions) {
        if (item.isConflictGroup) {
            const found = item.suggestions.find(s => s.id === suggestionId);
            if (found) { suggestionToAccept = found; break; }
        } else if (item.id === suggestionId) {
            suggestionToAccept = item;
            break;
        }
    }

    if (!suggestionToAccept) {
        console.warn(`⚠️ Suggestion not found in state: ${suggestionId}`);
        return;
    }

    let tr = view.state.tr;
    // This logic was confirmed correct by our live test.
    const replacementText = suggestionToAccept.replacement || suggestionToAccept.suggestion || '';

    console.log(`🔧 Accepting suggestion ${suggestionId}: "${suggestionToAccept.original}" → "${replacementText}"`);

    if (replacementText.length > 0) {
        tr.replaceWith(suggestionToAccept.from, suggestionToAccept.to, view.state.schema.text(replacementText));
    } else {
        tr.delete(suggestionToAccept.from, suggestionToAccept.to);
    }

    tr.setMeta(coreSuggestionPluginKey, { type: 'acceptSuggestion', suggestionId });
    view.dispatch(tr);
}

export function clearAllSuggestions(view) {
    const tr = view.state.tr.setMeta(coreSuggestionPluginKey, { type: 'clearAll' });
    view.dispatch(tr);
}

export function getSuggestions(state) {
    const pluginState = coreSuggestionPluginKey.getState(state);
    return pluginState ? pluginState.suggestions : [];
}