// /utils/suggestionMatcher.js
// Multi-strategy suggestion matching system

import { 
    normalizeText, 
    generateFingerprint, 
    parseSuggestionId, 
    areSimilarSuggestions 
  } from './suggestionIdGenerator.js';
  
  /**
   * Advanced suggestion matcher with multiple fallback strategies
   */
  export class SuggestionMatcher {
    static MATCHING_STRATEGIES = [
      'exactId',           // Exact ID match (99% confidence)
      'contentFingerprint', // Normalized content hash (95% confidence)
      'normalizedText',    // Exact normalized text match (90% confidence)
      'fuzzyText',         // Levenshtein distance (85% confidence)
      'positionContext',   // Position + surrounding text (70% confidence)
      'partialMatch'       // Partial text matching (60% confidence)
    ];
  
    static CONFIDENCE_THRESHOLD = 0.75;
  
    /**
     * Find the best match for a UI suggestion in plugin suggestions
     * @param {Object} uiSuggestion - Suggestion from React state
     * @param {Array} pluginSuggestions - Suggestions from ProseMirror plugin
     * @returns {Object|null} Match result with suggestion and metadata
     */
    static findMatch(uiSuggestion, pluginSuggestions) {
      if (!uiSuggestion || !pluginSuggestions || pluginSuggestions.length === 0) {
        return null;
      }
  
      console.log(`🔍 Matching UI suggestion "${uiSuggestion.original?.substring(0, 30)}..." against ${pluginSuggestions.length} plugin suggestions`);
  
      let bestMatch = null;
      let highestConfidence = 0;
  
      for (const strategy of this.MATCHING_STRATEGIES) {
        const matches = this[strategy](uiSuggestion, pluginSuggestions);
        
        if (matches && matches.length > 0) {
          const topMatch = matches[0]; // Already sorted by confidence
          
          console.log(`  📋 Strategy '${strategy}': ${matches.length} matches, best confidence: ${(topMatch.confidence * 100).toFixed(1)}%`);
          
          if (topMatch.confidence > highestConfidence) {
            bestMatch = {
              ...topMatch,
              strategy,
              allMatches: matches
            };
            highestConfidence = topMatch.confidence;
          }
  
          // If we have a high-confidence match, stop searching
          if (topMatch.confidence >= 0.95) {
            console.log(`  ✅ High-confidence match found with '${strategy}', stopping search`);
            break;
          }
        }
      }
  
      if (bestMatch && bestMatch.confidence >= this.CONFIDENCE_THRESHOLD) {
        console.log(`✅ Best match: ID ${bestMatch.suggestion.id} with ${(bestMatch.confidence * 100).toFixed(1)}% confidence using '${bestMatch.strategy}'`);
        return bestMatch;
      } else {
        console.warn(`❌ No reliable match found. Best confidence: ${(highestConfidence * 100).toFixed(1)}%`);
        return null;
      }
    }
  
    /**
     * Strategy 1: Exact ID matching
     */
    static exactId(uiSuggestion, pluginSuggestions) {
      if (!uiSuggestion.id) return [];
  
      const matches = pluginSuggestions
        .filter(ps => ps.id === uiSuggestion.id)
        .map(ps => ({
          suggestion: ps,
          confidence: 0.99,
          reason: 'exact_id_match'
        }));
  
      return matches;
    }
  
    /**
     * Strategy 2: Content fingerprint matching
     */
    static contentFingerprint(uiSuggestion, pluginSuggestions) {
      if (!uiSuggestion.original || !uiSuggestion.suggestion) return [];
  
      const uiFingerprint = generateFingerprint(uiSuggestion.original, uiSuggestion.suggestion);
      
      const matches = pluginSuggestions
        .map(ps => {
          const pluginFingerprint = generateFingerprint(ps.original || '', ps.replacement || '');
          
          if (pluginFingerprint === uiFingerprint) {
            return {
              suggestion: ps,
              confidence: 0.95,
              reason: 'fingerprint_match',
              metadata: { uiFingerprint, pluginFingerprint }
            };
          }
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => b.confidence - a.confidence);
  
      return matches;
    }
  
    /**
     * Strategy 3: Normalized text matching
     */
    static normalizedText(uiSuggestion, pluginSuggestions) {
      if (!uiSuggestion.original) return [];
  
      const normalizedUI = normalizeText(uiSuggestion.original);
      
      const matches = pluginSuggestions
        .map(ps => {
          const normalizedPlugin = normalizeText(ps.original || '');
          
          if (normalizedUI === normalizedPlugin) {
            // Check replacement text similarity too
            const replacementMatch = this.calculateTextSimilarity(
              uiSuggestion.suggestion || '', 
              ps.replacement || ''
            );
            
            return {
              suggestion: ps,
              confidence: 0.90 * (0.7 + 0.3 * replacementMatch), // Weight original text more
              reason: 'normalized_text_match',
              metadata: { 
                originalMatch: 1.0, 
                replacementMatch,
                normalizedUI,
                normalizedPlugin
              }
            };
          }
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => b.confidence - a.confidence);
  
      return matches;
    }
  
    /**
     * Strategy 4: Fuzzy text matching using Levenshtein distance
     */
    static fuzzyText(uiSuggestion, pluginSuggestions) {
      if (!uiSuggestion.original) return [];
  
      const normalizedUI = normalizeText(uiSuggestion.original);
      
      const matches = pluginSuggestions
        .map(ps => {
          const normalizedPlugin = normalizeText(ps.original || '');
          
          if (normalizedPlugin.length === 0) return null;
          
          const similarity = this.calculateTextSimilarity(normalizedUI, normalizedPlugin);
          
          if (similarity >= 0.8) { // 80% similarity threshold
            const replacementSimilarity = this.calculateTextSimilarity(
              uiSuggestion.suggestion || '', 
              ps.replacement || ''
            );
            
            const combinedConfidence = 0.85 * (0.8 * similarity + 0.2 * replacementSimilarity);
            
            return {
              suggestion: ps,
              confidence: combinedConfidence,
              reason: 'fuzzy_text_match',
              metadata: { 
                originalSimilarity: similarity,
                replacementSimilarity,
                normalizedUI,
                normalizedPlugin
              }
            };
          }
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => b.confidence - a.confidence);
  
      return matches;
    }
  
    /**
     * Strategy 5: Position context matching
     */
    static positionContext(uiSuggestion, pluginSuggestions) {
      // This strategy considers the position and surrounding context
      // For now, we'll use a simplified version based on text length and position hints
      
      if (!uiSuggestion.original) return [];
      
      const uiLength = uiSuggestion.original.length;
      const uiWords = uiSuggestion.original.split(/\s+/).length;
      
      const matches = pluginSuggestions
        .map(ps => {
          const pluginLength = (ps.original || '').length;
          const pluginWords = (ps.original || '').split(/\s+/).length;
          
          // Calculate length similarity
          const lengthSimilarity = 1 - Math.abs(uiLength - pluginLength) / Math.max(uiLength, pluginLength);
          const wordSimilarity = 1 - Math.abs(uiWords - pluginWords) / Math.max(uiWords, pluginWords);
          
          // Look for partial text matches
          const textSimilarity = this.calculateTextSimilarity(
            normalizeText(uiSuggestion.original),
            normalizeText(ps.original || '')
          );
          
          const combinedScore = (lengthSimilarity * 0.3 + wordSimilarity * 0.3 + textSimilarity * 0.4);
          
          if (combinedScore >= 0.6) {
            return {
              suggestion: ps,
              confidence: 0.70 * combinedScore,
              reason: 'position_context_match',
              metadata: {
                lengthSimilarity,
                wordSimilarity,
                textSimilarity,
                uiLength,
                pluginLength
              }
            };
          }
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => b.confidence - a.confidence);
  
      return matches;
    }
  
    /**
     * Strategy 6: Partial matching for edge cases
     */
    static partialMatch(uiSuggestion, pluginSuggestions) {
      if (!uiSuggestion.original || uiSuggestion.original.length < 10) return [];
  
      const normalizedUI = normalizeText(uiSuggestion.original);
      const uiWords = normalizedUI.split(/\s+/).filter(w => w.length > 3); // Significant words only
      
      if (uiWords.length < 2) return [];
  
      const matches = pluginSuggestions
        .map(ps => {
          const normalizedPlugin = normalizeText(ps.original || '');
          const pluginWords = normalizedPlugin.split(/\s+/).filter(w => w.length > 3);
          
          if (pluginWords.length < 2) return null;
          
          // Calculate word overlap
          const overlap = uiWords.filter(word => pluginWords.includes(word));
          const overlapRatio = overlap.length / Math.min(uiWords.length, pluginWords.length);
          
          if (overlapRatio >= 0.7) { // 70% word overlap
            return {
              suggestion: ps,
              confidence: 0.60 * overlapRatio,
              reason: 'partial_word_match',
              metadata: {
                wordOverlap: overlap.length,
                totalUIWords: uiWords.length,
                totalPluginWords: pluginWords.length,
                overlapRatio,
                sharedWords: overlap
              }
            };
          }
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => b.confidence - a.confidence);
  
      return matches;
    }
  
    /**
     * Calculate text similarity using a simplified Levenshtein distance
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Similarity score (0-1)
     */
    static calculateTextSimilarity(str1, str2) {
      if (!str1 || !str2) return 0;
      if (str1 === str2) return 1;
  
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
  
      if (longer.length === 0) return 1;
  
      const distance = this.levenshteinDistance(longer, shorter);
      return (longer.length - distance) / longer.length;
    }
  
    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Edit distance
     */
    static levenshteinDistance(str1, str2) {
      const matrix = [];
  
      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }
  
      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }
  
      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1, // substitution
              matrix[i][j - 1] + 1,     // insertion
              matrix[i - 1][j] + 1      // deletion
            );
          }
        }
      }
  
      return matrix[str2.length][str1.length];
    }
  
    /**
     * Get matching statistics for debugging
     * @param {Array} uiSuggestions - UI suggestions
     * @param {Array} pluginSuggestions - Plugin suggestions
     * @returns {Object} Matching statistics
     */
    static getMatchingStats(uiSuggestions, pluginSuggestions) {
      const stats = {
        totalUI: uiSuggestions.length,
        totalPlugin: pluginSuggestions.length,
        matched: 0,
        unmatched: 0,
        strategies: {},
        averageConfidence: 0,
        confidenceDistribution: { high: 0, medium: 0, low: 0 }
      };
  
      let totalConfidence = 0;
  
      uiSuggestions.forEach(uiSug => {
        const match = this.findMatch(uiSug, pluginSuggestions);
        
        if (match) {
          stats.matched++;
          stats.strategies[match.strategy] = (stats.strategies[match.strategy] || 0) + 1;
          totalConfidence += match.confidence;
          
          if (match.confidence >= 0.9) stats.confidenceDistribution.high++;
          else if (match.confidence >= 0.7) stats.confidenceDistribution.medium++;
          else stats.confidenceDistribution.low++;
        } else {
          stats.unmatched++;
        }
      });
  
      stats.averageConfidence = stats.matched > 0 ? totalConfidence / stats.matched : 0;
      stats.matchRate = stats.totalUI > 0 ? stats.matched / stats.totalUI : 0;
  
      return stats;
    }
  }
  
  export default SuggestionMatcher;