// /utils/conflictResolver.js
// PRODUCTION-READY: Handles overlapping suggestions and priority-based conflict resolution

/**
 * ENTERPRISE-GRADE CONFLICT RESOLVER
 * Manages overlapping suggestions with editorial hierarchy and smart merging
 * Handles cascade effects when suggestions interact
 */
export class ConflictResolver {
  constructor() {
    // Editorial hierarchy - Developmental is highest priority
    this.EDIT_PRIORITY = {
      'Developmental': 5,  // Highest - story, character, plot changes
      'Structural': 4,     // Chapter flow, scene organization  
      'Line': 3,          // Voice, style, sentence craft
      'Copy': 2,          // Grammar, syntax, technical correctness
      'Proof': 1          // Lowest - typos, spelling, formatting
    };

    // Performance tracking
    this.conflictStats = {
      totalConflicts: 0,
      resolvedConflicts: 0,
      mergedSuggestions: 0,
      invalidatedSuggestions: 0
    };
  }

  /**
   * Detect all overlapping suggestions in a set
   * @param {Array} suggestions - Array of suggestion objects with positions
   * @returns {Array} Array of conflict groups
   */
  detectOverlaps(suggestions) {
    const conflicts = [];
    const processed = new Set();

    // Sort suggestions by start position for efficient processing
    const sortedSuggestions = [...suggestions].sort((a, b) => 
      (a.proseMirrorStart || a.start || 0) - (b.proseMirrorStart || b.start || 0)
    );

    for (let i = 0; i < sortedSuggestions.length; i++) {
      if (processed.has(i)) continue;

      const suggestion = sortedSuggestions[i];
      const conflictGroup = [{ suggestion, index: i }];
      processed.add(i);

      // Find all suggestions that overlap with this one
      for (let j = i + 1; j < sortedSuggestions.length; j++) {
        if (processed.has(j)) continue;

        const otherSuggestion = sortedSuggestions[j];
        
        if (this.doSuggestionsOverlap(suggestion, otherSuggestion)) {
          conflictGroup.push({ suggestion: otherSuggestion, index: j });
          processed.add(j);
        }
      }

      // Only add groups with actual conflicts (2+ suggestions)
      if (conflictGroup.length > 1) {
        conflicts.push({
          type: 'overlap',
          suggestions: conflictGroup,
          severity: this.calculateConflictSeverity(conflictGroup)
        });
        this.conflictStats.totalConflicts++;
      }
    }

    return conflicts;
  }

  /**
   * Check if two suggestions overlap
   * @param {Object} sugA - First suggestion
   * @param {Object} sugB - Second suggestion  
   * @returns {boolean} True if suggestions overlap
   */
  doSuggestionsOverlap(sugA, sugB) {
    const aStart = sugA.proseMirrorStart || sugA.start || 0;
    const aEnd = sugA.proseMirrorEnd || sugA.end || 0;
    const bStart = sugB.proseMirrorStart || sugB.start || 0;
    const bEnd = sugB.proseMirrorEnd || sugB.end || 0;

    // No overlap if one ends before the other starts
    return !(aEnd <= bStart || bEnd <= aStart);
  }

  /**
   * Calculate severity of conflict for prioritization
   * @param {Array} conflictGroup - Group of conflicting suggestions
   * @returns {number} Severity score (higher = more severe)
   */
  calculateConflictSeverity(conflictGroup) {
    let severity = conflictGroup.length; // Base severity on number of conflicts

    // Increase severity for high-priority edit types
    conflictGroup.forEach(({ suggestion }) => {
      const priority = this.getPriority(suggestion.editType);
      severity += priority * 0.5;
    });

    // Increase severity for larger text spans
    const totalSpan = conflictGroup.reduce((max, { suggestion }) => {
      const span = (suggestion.proseMirrorEnd || suggestion.end) - 
                   (suggestion.proseMirrorStart || suggestion.start);
      return Math.max(max, span);
    }, 0);

    severity += Math.min(totalSpan / 100, 5); // Cap span contribution

    return severity;
  }

  /**
   * Resolve conflicts using priority-based strategy
   * @param {Array} conflicts - Array of conflict groups
   * @param {Object} options - Resolution options
   * @returns {Object} Resolution result
   */
  resolveConflicts(conflicts, options = {}) {
    const {
      strategy = 'priority', // 'priority', 'merge', 'user_choice'
      allowMerging = true,
      preserveUserEdits = true
    } = options;

    const resolutionResult = {
      resolvedSuggestions: [],
      mergedSuggestions: [],
      invalidatedSuggestions: [],
      userChoiceRequired: []
    };

    for (const conflict of conflicts) {
      const resolution = this.resolveConflictGroup(conflict, strategy, {
        allowMerging,
        preserveUserEdits
      });

      // Merge results
      resolutionResult.resolvedSuggestions.push(...resolution.resolved);
      resolutionResult.mergedSuggestions.push(...resolution.merged);
      resolutionResult.invalidatedSuggestions.push(...resolution.invalidated);
      resolutionResult.userChoiceRequired.push(...resolution.userChoice);

      this.conflictStats.resolvedConflicts++;
    }

    return resolutionResult;
  }

  /**
   * Resolve a single conflict group
   * @param {Object} conflict - Conflict group
   * @param {string} strategy - Resolution strategy
   * @param {Object} options - Resolution options
   * @returns {Object} Resolution for this group
   */
  resolveConflictGroup(conflict, strategy, options) {
    const { suggestions } = conflict;
    const result = {
      resolved: [],
      merged: [],
      invalidated: [],
      userChoice: []
    };

    switch (strategy) {
      case 'priority':
        result.resolved = this.resolveByCasualPriority(suggestions);
        break;

      case 'merge':
        if (options.allowMerging && this.canMergeSuggestions(suggestions)) {
          const merged = this.mergeSuggestions(suggestions);
          result.merged = [merged];
          this.conflictStats.mergedSuggestions++;
        } else {
          result.resolved = this.resolveByCasualPriority(suggestions);
        }
        break;

      case 'user_choice':
        // Complex conflicts require user decision
        if (conflict.severity > 5) {
          result.userChoice = suggestions;
        } else {
          result.resolved = this.resolveByCasualPriority(suggestions);
        }
        break;

      default:
        result.resolved = this.resolveByCasualPriority(suggestions);
    }

    return result;
  }

  /**
   * Resolve conflicts using editorial priority hierarchy
   * @param {Array} suggestions - Conflicting suggestions
   * @returns {Array} Winning suggestions
   */
  resolveByCasualPriority(suggestions) {
    // Sort by priority (highest first)
    const prioritized = suggestions.sort((a, b) => {
      const priorityA = this.getPriority(a.suggestion.editType);
      const priorityB = this.getPriority(b.suggestion.editType);
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }
      
      // If same priority, prefer higher confidence
      const confA = a.suggestion.confidence || 0;
      const confB = b.suggestion.confidence || 0;
      
      if (confA !== confB) {
        return confB - confA;
      }
      
      // If same confidence, prefer shorter text (more precise)
      const spanA = (a.suggestion.proseMirrorEnd || a.suggestion.end) - 
                    (a.suggestion.proseMirrorStart || a.suggestion.start);
      const spanB = (b.suggestion.proseMirrorEnd || b.suggestion.end) - 
                    (b.suggestion.proseMirrorStart || b.suggestion.start);
      
      return spanA - spanB;
    });

    // Return the highest priority suggestion
    return [prioritized[0]];
  }

  /**
   * Check if suggestions can be merged into a single suggestion
   * @param {Array} suggestions - Suggestions to check
   * @returns {boolean} True if mergeable
   */
  canMergeSuggestions(suggestions) {
    // Only merge suggestions of the same type
    const editTypes = new Set(suggestions.map(s => s.suggestion.editType));
    if (editTypes.size > 1) return false;

    // Only merge if they're adjacent or have minimal overlap
    const sorted = suggestions.sort((a, b) => 
      (a.suggestion.proseMirrorStart || a.suggestion.start) - 
      (b.suggestion.proseMirrorStart || b.suggestion.start)
    );

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i].suggestion;
      const next = sorted[i + 1].suggestion;
      
      const currentEnd = current.proseMirrorEnd || current.end;
      const nextStart = next.proseMirrorStart || next.start;
      
      // Gap too large to merge
      if (nextStart - currentEnd > 50) return false;
    }

    return true;
  }

  /**
   * Merge compatible suggestions into a single suggestion
   * @param {Array} suggestions - Suggestions to merge
   * @returns {Object} Merged suggestion
   */
  mergeSuggestions(suggestions) {
    const sorted = suggestions.sort((a, b) => 
      (a.suggestion.proseMirrorStart || a.suggestion.start) - 
      (b.suggestion.proseMirrorStart || b.suggestion.start)
    );

    const first = sorted[0].suggestion;
    const last = sorted[sorted.length - 1].suggestion;

    const merged = {
      id: `merged_${Date.now()}`,
      editType: first.editType,
      proseMirrorStart: first.proseMirrorStart || first.start,
      proseMirrorEnd: last.proseMirrorEnd || last.end,
      start: first.start,
      end: last.end,
      original: suggestions.map(s => s.suggestion.original).join(' '),
      suggestion: suggestions.map(s => s.suggestion.suggestion).join(' '),
      why: `Merged ${suggestions.length} ${first.editType} suggestions`,
      confidence: Math.min(...suggestions.map(s => s.suggestion.confidence || 1)),
      isMerged: true,
      mergedFrom: suggestions.map(s => s.suggestion.id)
    };

    return merged;
  }

  /**
   * Get priority score for edit type
   * @param {string} editType - Type of edit
   * @returns {number} Priority score
   */
  getPriority(editType) {
    return this.EDIT_PRIORITY[editType] || 0;
  }

  /**
   * Handle cascade effects when a suggestion is accepted
   * @param {Object} acceptedSuggestion - The accepted suggestion
   * @param {Array} allSuggestions - All remaining suggestions
   * @returns {Array} Suggestions that need to be updated or invalidated
   */
  handleCascadeEffects(acceptedSuggestion, allSuggestions) {
    const cascadeEffects = {
      invalidated: [],
      positionUpdates: [],
      revalidationNeeded: []
    };

    const acceptedStart = acceptedSuggestion.proseMirrorStart || acceptedSuggestion.start;
    const acceptedEnd = acceptedSuggestion.proseMirrorEnd || acceptedSuggestion.end;
    const textLengthChange = acceptedSuggestion.suggestion.length - acceptedSuggestion.original.length;

    for (const suggestion of allSuggestions) {
      if (suggestion.id === acceptedSuggestion.id) continue;

      const sugStart = suggestion.proseMirrorStart || suggestion.start;
      const sugEnd = suggestion.proseMirrorEnd || suggestion.end;

      // Invalidate overlapping suggestions
      if (this.doSuggestionsOverlap(acceptedSuggestion, suggestion)) {
        cascadeEffects.invalidated.push(suggestion);
        this.conflictStats.invalidatedSuggestions++;
        continue;
      }

      // Update positions for suggestions after the accepted one
      if (sugStart > acceptedEnd) {
        const updatedSuggestion = {
          ...suggestion,
          proseMirrorStart: sugStart + textLengthChange,
          proseMirrorEnd: sugEnd + textLengthChange,
          start: (suggestion.start || 0) + textLengthChange,
          end: (suggestion.end || 0) + textLengthChange,
          needsRevalidation: Math.abs(textLengthChange) > 10 // Significant change
        };
        
        cascadeEffects.positionUpdates.push(updatedSuggestion);
        
        if (updatedSuggestion.needsRevalidation) {
          cascadeEffects.revalidationNeeded.push(updatedSuggestion);
        }
      }
    }

    return cascadeEffects;
  }

  /**
   * Get conflict resolution statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.conflictStats,
      resolutionRate: this.conflictStats.totalConflicts > 0 ? 
        this.conflictStats.resolvedConflicts / this.conflictStats.totalConflicts : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.conflictStats = {
      totalConflicts: 0,
      resolvedConflicts: 0,
      mergedSuggestions: 0,
      invalidatedSuggestions: 0
    };
  }
}

// Export singleton instance
export const conflictResolver = new ConflictResolver();