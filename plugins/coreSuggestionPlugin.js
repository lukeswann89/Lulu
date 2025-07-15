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
        // Standard mapping of positions through transactions
        let suggestions = this.suggestions.map(s => ({
            ...s,
            from: tr.mapping.map(s.from),
            to: tr.mapping.map(s.to),
        }));
        let decorations = this.decorations.map(tr.mapping, tr.doc);
        let activeConflict = this.activeConflict;

        const action = tr.getMeta(coreSuggestionPluginKey);

        if (action) {
            switch (action.type) {
                case 'setSuggestions':
                    const result = this.handleSetSuggestions(action, tr.doc);
                    decorations = result.decorations;
                    suggestions = result.suggestions;
                    break;

                // LULU'S CONSCIENCE: New action to handle showing the conflict UI
                case 'showConflict':
                    activeConflict = suggestions.find(s => s.id === action.groupId);
                    console.log(`💡 Conscience: User is examining conflict group ${action.groupId}.`);
                    break;
                
                case 'hideConflict':
                    activeConflict = null;
                    break;

                case 'acceptSuggestion':
                    const acceptResult = this.handleAcceptSuggestion(action, decorations, suggestions);
                    decorations = acceptResult.decorations;
                    suggestions = acceptResult.suggestions;
                    activeConflict = null; // Always hide conflict UI after a choice is made
                    break;

                case 'clearAll':
                    decorations = DecorationSet.empty;
                    suggestions = [];
                    activeConflict = null;
                    break;
            }
        }
        
        // If the document changed, we must re-validate and potentially regroup suggestions
        if (tr.docChanged) {
             // This is a complex step for a future iteration. For now, we rely on the `acceptSuggestion` flow
             // which clears all other suggestions to maintain integrity.
        }

        return new CoreSuggestionState(decorations, suggestions, activeConflict, this.metadata);
    }

    handleSetSuggestions(action, doc) {
        // --- REFACTORED: This function is now much simpler ---
        // It no longer needs to map positions; it receives them directly.
        const validSuggestions = action.suggestions.filter(s => s.from && s.to);

        const suggestionsWithOriginals = validSuggestions.map(s => {
            // We still need to get the original text for the record.
            const originalText = doc.textBetween(s.from, s.to);
            return {
                ...s,
                id: s.id || generateSuggestionId(originalText, s.suggestion),
                original: originalText,
                replacement: s.suggestion,
            };
        });

        const groupedSuggestions = ConflictGrouper.groupOverlaps(suggestionsWithOriginals);

        const newDecorations = groupedSuggestions.map(s => {
            if (s.isConflictGroup) {
                return Decoration.inline(s.from, s.to, {
                    class: 'suggestion-highlight conflict-highlight',
                    'data-conflict-group-id': s.id,
                    title: 'Multiple suggestions available. Click to see options.'
                });
            } else {
                return Decoration.inline(s.from, s.to, {
                    class: `suggestion-highlight ${s.editType.toLowerCase()}`,
                    'data-suggestion-id': s.id,
                    title: `${s.editType}: Click to replace with "${s.replacement}"`
                });
            }
        });

        return {
            decorations: DecorationSet.create(doc, newDecorations),
            suggestions: groupedSuggestions,
        };
    }

    handleAcceptSuggestion(action, decorations, suggestions) {
    const { suggestionId } = action;

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
    }

    const newSuggestions = suggestions.filter(s => {
        if (s.isConflictGroup) {
            return !s.suggestions.some(child => child.id === suggestionId);
        }
        return s.id !== suggestionId;
    });

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
                    const conflictGroupId = target.getAttribute('data-conflict-group-id');
                    const suggestionId = target.getAttribute('data-suggestion-id');

                    if (conflictGroupId) {
                        console.log(` crossroads clicked: ${conflictGroupId}`);
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
    const tr = view.state.tr.setMeta(coreSuggestionPluginKey, {
        type: 'setSuggestions',
        suggestions
    });
    view.dispatch(tr);
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