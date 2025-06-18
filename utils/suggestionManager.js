// /utils/suggestionManager.js
// High-level suggestion management utilities

import { findTextInDoc } from './prosemirrorHelpers.js';
import { addSuggestion, clearAllSuggestions, getSuggestions } from '../plugins/suggestionPlugin.js';

// Suggestion manager class
export class SuggestionManager {
  constructor(editorView) {
    this.view = editorView;
    this.stats = {
      added: 0,
      applied: 0,
      rejected: 0
    };
  }

  // Add suggestions for specific text
  addTextSuggestions(searchText, replacementText, suggestionType = 'suggestion') {
    const doc = this.view.state.doc;
    const positions = findTextInDoc(doc, searchText);
    
    if (positions.length === 0) {
      console.log(`⚠️ No occurrences found for: "${searchText}"`);
      return [];
    }

    // Add suggestions for each occurrence
    positions.forEach(pos => {
      addSuggestion(
        this.view,
        pos.from,
        pos.to,
        searchText,
        replacementText,
        suggestionType
      );
    });

    this.stats.added += positions.length;
    console.log(`🎯 Added ${positions.length} suggestions for "${searchText}"`);
    return positions;
  }

  // Add multiple suggestions at once
  addMultipleSuggestions(suggestions) {
    let totalAdded = 0;
    
    suggestions.forEach(suggestion => {
      const { find, replace, type = 'suggestion' } = suggestion;
      const added = this.addTextSuggestions(find, replace, type);
      totalAdded += added.length;
    });
    
    console.log(`📝 Added ${totalAdded} total suggestions from ${suggestions.length} patterns`);
    return totalAdded;
  }

  // Load demo suggestions (our proven test cases)
  loadDemoSuggestions() {
    const demoSuggestions = [
      {
        find: "looking down at the churning sea below",
        replace: "gazing at the turbulent waters beneath",
        type: "suggestion"
      },
      {
        find: "The wind was blowing very hard",
        replace: "The wind whipped fiercely",
        type: "grammar"
      },
      {
        find: "stood at the edge",
        replace: "perched on the precipice",
        type: "style"
      },
      {
        find: "through her hair",
        replace: "through her flowing locks",
        type: "structure"
      }
    ];

    this.clearAll();
    return this.addMultipleSuggestions(demoSuggestions);
  }

  // Clear all suggestions
  clearAll() {
    clearAllSuggestions(this.view);
    console.log('🧹 Cleared all suggestions');
  }

  // Get current suggestions
  getCurrentSuggestions() {
    return getSuggestions(this.view.state);
  }

  // Get statistics
  getStats() {
    const currentSuggestions = this.getCurrentSuggestions();
    return {
      ...this.stats,
      current: currentSuggestions.length,
      byType: this.groupSuggestionsByType(currentSuggestions)
    };
  }

  // Group suggestions by type
  groupSuggestionsByType(suggestions) {
    const grouped = {};
    suggestions.forEach(suggestion => {
      const type = suggestion.suggestionType || 'suggestion';
      grouped[type] = (grouped[type] || 0) + 1;
    });
    return grouped;
  }

  // Replace all occurrences without highlighting
  replaceAllText(searchText, replacementText) {
    const doc = this.view.state.doc;
    const positions = findTextInDoc(doc, searchText);
    
    if (positions.length === 0) {
      console.log(`⚠️ No occurrences found for: "${searchText}"`);
      return 0;
    }

    // Sort positions in reverse order to maintain accuracy
    positions.sort((a, b) => b.from - a.from);
    
    let tr = this.view.state.tr;
    
    positions.forEach(pos => {
      tr = tr.replaceWith(pos.from, pos.to, this.view.state.schema.text(replacementText));
    });
    
    this.view.dispatch(tr);
    
    console.log(`🔄 Replaced ${positions.length} occurrences of "${searchText}" with "${replacementText}"`);
    return positions.length;
  }

  // Find and count occurrences
  findOccurrences(searchText) {
    const doc = this.view.state.doc;
    return findTextInDoc(doc, searchText);
  }

  // Validate suggestions (check if text still exists)
  validateSuggestions() {
    const suggestions = this.getCurrentSuggestions();
    const doc = this.view.state.doc;
    
    let validCount = 0;
    suggestions.forEach(suggestion => {
      const actualText = doc.textBetween(suggestion.from, suggestion.to);
      if (actualText === suggestion.original) {
        validCount++;
      } else {
        console.warn(`⚠️ Suggestion ${suggestion.id} validation failed: expected "${suggestion.original}", got "${actualText}"`);
      }
    });
    
    console.log(`✅ ${validCount}/${suggestions.length} suggestions are valid`);
    return validCount === suggestions.length;
  }

  // Export current document with suggestions applied
  exportWithSuggestions() {
    // This would apply all suggestions and return the text
    // For now, just return current text
    const doc = this.view.state.doc;
    let text = '';
    
    doc.descendants(node => {
      if (node.isText) {
        text += node.text;
      } else if (node.type.name === 'paragraph') {
        text += '\n\n';
      }
    });
    
    return text.trim();
  }

  // Analytics and tracking
  trackSuggestionAccepted(suggestionId) {
    this.stats.applied++;
    console.log(`📊 Suggestion ${suggestionId} accepted. Total applied: ${this.stats.applied}`);
  }

  trackSuggestionRejected(suggestionId) {
    this.stats.rejected++;
    console.log(`📊 Suggestion ${suggestionId} rejected. Total rejected: ${this.stats.rejected}`);
  }

  // Reset statistics
  resetStats() {
    this.stats = {
      added: 0,
      applied: 0,
      rejected: 0
    };
    console.log('📊 Statistics reset');
  }
}

// Factory function
export function createSuggestionManager(editorView) {
  return new SuggestionManager(editorView);
}

export default SuggestionManager;