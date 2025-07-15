// /utils/suggestionReconciler.js
// State reconciliation between UI and ProseMirror plugin

import { addSuggestion, getSuggestions } from '../plugins/suggestionPlugin.js';
import { findTextInDoc } from './prosemirrorHelpers.js';
import { normalizeText, generateSuggestionId } from './suggestionIdGenerator.js';
import { SuggestionMatcher } from './suggestionMatcher.js';

/**
 * Suggestion reconciliation system for keeping UI and plugin state synchronized
 */
export class SuggestionReconciler {
  
  /**
   * Reconcile UI suggestions with plugin state
   * @param {EditorView} view - ProseMirror editor view
   * @param {Array} uiSuggestions - Suggestions from React state
   * @returns {Object} Reconciliation result
   */
  static reconcile(view, uiSuggestions) {
    if (!view || !uiSuggestions) {
      return { success: false, error: 'Invalid parameters' };
    }

    const pluginSuggestions = getSuggestions(view.state);
    const reconciliationResult = {
      success: true,
      operations: [],
      errors: [],
      stats: {
        uiTotal: uiSuggestions.length,
        pluginTotal: pluginSuggestions.length,
        matched: 0,
        added: 0,
        orphaned: 0
      }
    };

    console.log(`🔄 Starting reconciliation: ${uiSuggestions.length} UI suggestions vs ${pluginSuggestions.length} plugin suggestions`);

    // Track which plugin suggestions have been matched
    const matchedPluginIds = new Set();

    // Process each UI suggestion
    uiSuggestions.forEach((uiSug, index) => {
      try {
        const match = SuggestionMatcher.findMatch(uiSug, pluginSuggestions);
        
        if (match && match.confidence >= SuggestionMatcher.CONFIDENCE_THRESHOLD) {
          // Found a good match
          matchedPluginIds.add(match.suggestion.id);
          reconciliationResult.stats.matched++;
          
          reconciliationResult.operations.push({
            type: 'matched',
            uiIndex: index,
            pluginId: match.suggestion.id,
            confidence: match.confidence,
            strategy: match.strategy
          });
        } else {
          // No match found - try to recreate the suggestion
          const recreateResult = this.recreateSuggestion(view, uiSug);
          
          if (recreateResult.success) {
            reconciliationResult.stats.added++;
            reconciliationResult.operations.push({
              type: 'recreated',
              uiIndex: index,
              newPluginId: recreateResult.suggestionId,
              originalText: recreateResult.originalText
            });
          } else {
            reconciliationResult.errors.push({
              type: 'recreation_failed',
              uiIndex: index,
              uiSuggestion: {
                id: uiSug.id,
                original: uiSug.original?.substring(0, 50) + '...',
              },
              error: recreateResult.error
            });
          }
        }
      } catch (error) {
        reconciliationResult.errors.push({
          type: 'processing_error',
          uiIndex: index,
          error: error.message
        });
      }
    });

    // Find orphaned plugin suggestions (not matched to any UI suggestion)
    const orphanedSuggestions = pluginSuggestions.filter(ps => !matchedPluginIds.has(ps.id));
    reconciliationResult.stats.orphaned = orphanedSuggestions.length;

    if (orphanedSuggestions.length > 0) {
      console.warn(`⚠️ Found ${orphanedSuggestions.length} orphaned plugin suggestions`);
      orphanedSuggestions.forEach(orphan => {
        reconciliationResult.operations.push({
          type: 'orphaned',
          pluginId: orphan.id,
          original: orphan.original?.substring(0, 50) + '...'
        });
      });
    }

    console.log(`✅ Reconciliation complete:`, reconciliationResult.stats);
    return reconciliationResult;
  }

  /**
   * Attempt to recreate a UI suggestion in the plugin
   * @param {EditorView} view - ProseMirror editor view
   * @param {Object} uiSuggestion - UI suggestion to recreate
   * @returns {Object} Recreation result
   */
  static recreateSuggestion(view, uiSuggestion) {
    try {
      if (!uiSuggestion.original || !uiSuggestion.suggestion) {
        return {
          success: false,
          error: 'Missing original or suggestion text'
        };
      }

      const doc = view.state.doc;
      const searchText = uiSuggestion.original;

      // Try to find the text in the document
      const match = findTextInDoc(doc, searchText);
      
      if (!match) {
        // Try with normalized text
        const normalizedSearch = normalizeText(searchText);
        const docText = normalizeText(doc.textContent);
        
        if (docText.includes(normalizedSearch)) {
          // Text exists but might be slightly different - try fuzzy matching
          const fuzzyMatch = this.findFuzzyTextMatch(doc, searchText);
          
          if (fuzzyMatch) {
            return this.createSuggestionFromMatch(view, fuzzyMatch, uiSuggestion);
          }
        }

        return {
          success: false,
          error: `Text not found in document: "${searchText.substring(0, 30)}..."`
        };
      }

      return this.createSuggestionFromMatch(view, match, uiSuggestion);

    } catch (error) {
      return {
        success: false,
        error: `Recreation failed: ${error.message}`
      };
    }
  }

  /**
   * Create a plugin suggestion from a text match
   * @param {EditorView} view - ProseMirror editor view
   * @param {Object} match - Text match result
   * @param {Object} uiSuggestion - Original UI suggestion
   * @returns {Object} Creation result
   */
  static createSuggestionFromMatch(view, match, uiSuggestion) {
    try {
      const suggestionId = generateSuggestionId(
        match.text,
        uiSuggestion.suggestion,
        {
          editType: uiSuggestion.editType || 'Line',
          confidence: 0.8 // Recreated suggestions have slightly lower confidence
        }
      );

      addSuggestion(
        view,
        match.from,
        match.to,
        match.text,
        uiSuggestion.suggestion,
        uiSuggestion.editType || 'Line',
        suggestionId
      );

      console.log(`✅ Recreated suggestion: "${match.text}" → "${uiSuggestion.suggestion}"`);

      return {
        success: true,
        suggestionId,
        originalText: match.text,
        from: match.from,
        to: match.to
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to create suggestion: ${error.message}`
      };
    }
  }

  /**
   * Find fuzzy text match using multiple strategies
   * @param {Node} doc - ProseMirror document
   * @param {string} searchText - Text to find
   * @returns {Object|null} Match result or null
   */
  static findFuzzyTextMatch(doc, searchText) {
    const normalizedSearch = normalizeText(searchText);
    const docText = doc.textContent;
    const normalizedDoc = normalizeText(docText);

    // Strategy 1: Look for substring match
    const subIndex = normalizedDoc.indexOf(normalizedSearch);
    if (subIndex !== -1) {
      return this.mapNormalizedPositionToDoc(doc, subIndex, subIndex + normalizedSearch.length);
    }

    // Strategy 2: Word-based fuzzy matching
    const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 3);
    if (searchWords.length >= 2) {
      const wordMatches = this.findWordSequenceMatch(doc, searchWords);
      if (wordMatches) {
        return wordMatches;
      }
    }

    // Strategy 3: Character-based fuzzy matching for short texts
    if (searchText.length <= 50) {
      return this.findCharacterFuzzyMatch(doc, normalizedSearch);
    }

    return null;
  }

  /**
   * Map normalized text positions back to document positions
   * @param {Node} doc - ProseMirror document
   * @param {number} normalizedStart - Start position in normalized text
   * @param {number} normalizedEnd - End position in normalized text
   * @returns {Object|null} Document position match
   */
  static mapNormalizedPositionToDoc(doc, normalizedStart, normalizedEnd) {
    const docText = doc.textContent;
    let docPos = 0;
    let normalizedPos = 0;
    let startFound = false;
    let startPos = 0;

    for (let i = 0; i < docText.length; i++) {
      const char = docText[i];
      
      if (normalizedPos === normalizedStart && !startFound) {
        startPos = docPos;
        startFound = true;
      }
      
      if (normalizedPos === normalizedEnd) {
        return {
          from: startPos,
          to: docPos,
          text: docText.substring(startPos, docPos)
        };
      }

      // Count position in normalized space
      if (/\s/.test(char)) {
        // Skip multiple whitespace in normalized text
        if (normalizedPos < docText.length && !/\s/.test(normalizeText(docText).charAt(normalizedPos))) {
          normalizedPos++;
        }
      } else {
        normalizedPos++;
      }
      
      docPos++;
    }

    return null;
  }

  /**
   * Find a sequence of words in the document
   * @param {Node} doc - ProseMirror document
   * @param {Array} searchWords - Words to find in sequence
   * @returns {Object|null} Match result
   */
  static findWordSequenceMatch(doc, searchWords) {
    const docText = doc.textContent;
    const docWords = normalizeText(docText).split(/\s+/);
    
    for (let i = 0; i <= docWords.length - searchWords.length; i++) {
      let matched = true;
      
      for (let j = 0; j < searchWords.length; j++) {
        if (docWords[i + j] !== searchWords[j]) {
          matched = false;
          break;
        }
      }
      
      if (matched) {
        // Find the actual positions in the original text
        const firstWord = searchWords[0];
        const lastWord = searchWords[searchWords.length - 1];
        
        const firstWordIndex = docText.toLowerCase().indexOf(firstWord);
        const lastWordIndex = docText.toLowerCase().lastIndexOf(lastWord);
        
        if (firstWordIndex !== -1 && lastWordIndex !== -1) {
          return {
            from: firstWordIndex,
            to: lastWordIndex + lastWord.length,
            text: docText.substring(firstWordIndex, lastWordIndex + lastWord.length)
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Character-based fuzzy matching for short texts
   * @param {Node} doc - ProseMirror document
   * @param {string} normalizedSearch - Normalized search text
   * @returns {Object|null} Match result
   */
  static findCharacterFuzzyMatch(doc, normalizedSearch) {
    const docText = normalizeText(doc.textContent);
    const searchLength = normalizedSearch.length;
    
    let bestMatch = null;
    let bestSimilarity = 0;
    
    // Sliding window approach
    for (let i = 0; i <= docText.length - searchLength; i++) {
      const window = docText.substring(i, i + searchLength);
      const similarity = this.calculateSimpleSimilarity(normalizedSearch, window);
      
      if (similarity > bestSimilarity && similarity >= 0.8) {
        bestSimilarity = similarity;
        bestMatch = {
          from: i,
          to: i + searchLength,
          text: doc.textContent.substring(i, i + searchLength),
          similarity
        };
      }
    }
    
    return bestMatch;
  }

  /**
   * Calculate simple character-based similarity
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  static calculateSimpleSimilarity(str1, str2) {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;
    
    const maxLength = Math.max(str1.length, str2.length);
    let matches = 0;
    
    for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
      if (str1[i] === str2[i]) {
        matches++;
      }
    }
    
    return matches / maxLength;
  }

  /**
   * Validate reconciliation result
   * @param {Object} result - Reconciliation result
   * @returns {boolean} True if result is valid
   */
  static validateReconciliationResult(result) {
    if (!result || typeof result !== 'object') return false;
    
    const required = ['success', 'operations', 'errors', 'stats'];
    return required.every(prop => result.hasOwnProperty(prop));
  }

  /**
   * Generate reconciliation report for debugging
   * @param {Object} result - Reconciliation result
   * @returns {string} Human-readable report
   */
  static generateReconciliationReport(result) {
    if (!this.validateReconciliationResult(result)) {
      return 'Invalid reconciliation result';
    }

    const { stats, operations, errors } = result;
    
    let report = `📊 Suggestion Reconciliation Report\n`;
    report += `================================\n`;
    report += `UI Suggestions: ${stats.uiTotal}\n`;
    report += `Plugin Suggestions: ${stats.pluginTotal}\n`;
    report += `Matched: ${stats.matched}\n`;
    report += `Added: ${stats.added}\n`;
    report += `Orphaned: ${stats.orphaned}\n`;
    report += `Errors: ${errors.length}\n\n`;

    if (operations.length > 0) {
      report += `Operations:\n`;
      operations.forEach((op, i) => {
        report += `  ${i + 1}. ${op.type}`;
        if (op.confidence) report += ` (${(op.confidence * 100).toFixed(1)}% confidence)`;
        if (op.strategy) report += ` via ${op.strategy}`;
        report += `\n`;
      });
      report += `\n`;
    }

    if (errors.length > 0) {
      report += `Errors:\n`;
      errors.forEach((error, i) => {
        report += `  ${i + 1}. ${error.type}: ${error.error}\n`;
      });
    }

    return report;
  }

  /**
   * Get reconciliation statistics
   * @param {Object} result - Reconciliation result
   * @returns {Object} Statistics summary
   */
  static getReconciliationStats(result) {
    if (!this.validateReconciliationResult(result)) {
      return null;
    }

    const { stats, operations, errors } = result;
    
    return {
      ...stats,
      successRate: stats.uiTotal > 0 ? (stats.matched + stats.added) / stats.uiTotal : 0,
      errorRate: stats.uiTotal > 0 ? errors.length / stats.uiTotal : 0,
      operationTypes: operations.reduce((acc, op) => {
        acc[op.type] = (acc[op.type] || 0) + 1;
        return acc;
      }, {}),
      hasOrphanedSuggestions: stats.orphaned > 0,
      hasErrors: errors.length > 0
    };
  }
}

export default SuggestionReconciler;