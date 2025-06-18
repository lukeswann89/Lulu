// /plugins/positionMapper.js
// Advanced position tracking and mapping utilities

export class PositionMapper {
  constructor() {
    this.mappings = new Map();
    this.nextMappingId = 1;
  }

  // Create a new mapping for a transaction
  createMapping(tr) {
    const mappingId = this.nextMappingId++;
    this.mappings.set(mappingId, {
      mapping: tr.mapping,
      timestamp: Date.now(),
      changes: this.extractChanges(tr)
    });
    return mappingId;
  }

  // Extract changes from a transaction
  extractChanges(tr) {
    const changes = [];
    tr.steps.forEach((step, index) => {
      if (step.jsonID === 'replace' || step.jsonID === 'replaceAround') {
        changes.push({
          type: 'replace',
          from: step.from,
          to: step.to,
          slice: step.slice,
          stepIndex: index
        });
      }
    });
    return changes;
  }

  // Map a position through a series of transactions
  mapPosition(pos, mappingId, bias = 1) {
    const mapping = this.mappings.get(mappingId);
    if (!mapping) {
      console.warn(`No mapping found for ID: ${mappingId}`);
      return pos;
    }

    try {
      return mapping.mapping.map(pos, bias);
    } catch (error) {
      console.warn(`Position mapping failed for pos ${pos}:`, error);
      return pos;
    }
  }

  // Map a range through transactions
  mapRange(from, to, mappingId, bias = 1) {
    const mapping = this.mappings.get(mappingId);
    if (!mapping) {
      console.warn(`No mapping found for ID: ${mappingId}`);
      return { from, to };
    }

    try {
      return {
        from: mapping.mapping.map(from, bias),
        to: mapping.mapping.map(to, bias)
      };
    } catch (error) {
      console.warn(`Range mapping failed for ${from}-${to}:`, error);
      return { from, to };
    }
  }

  // Check if a position was deleted
  wasDeleted(pos, mappingId) {
    const mapping = this.mappings.get(mappingId);
    if (!mapping) return false;

    try {
      const mapped = mapping.mapping.map(pos, 1);
      return mapped === null || mapped === undefined;
    } catch (error) {
      return true; // Assume deleted if mapping fails
    }
  }

  // Get all positions that would be affected by a change
  getAffectedPositions(from, to, mappingId) {
    const mapping = this.mappings.get(mappingId);
    if (!mapping) return [];

    const affected = [];
    for (let pos = from; pos <= to; pos++) {
      try {
        const mapped = mapping.mapping.map(pos, 1);
        if (mapped !== null && mapped !== undefined) {
          affected.push({ original: pos, mapped });
        }
      } catch (error) {
        // Position was deleted or invalid
        affected.push({ original: pos, mapped: null });
      }
    }
    return affected;
  }

  // Clean up old mappings to prevent memory leaks
  cleanup(maxAge = 300000) { // 5 minutes default
    const now = Date.now();
    for (const [id, mapping] of this.mappings) {
      if (now - mapping.timestamp > maxAge) {
        this.mappings.delete(id);
      }
    }
  }

  // Get mapping statistics
  getStats() {
    return {
      totalMappings: this.mappings.size,
      oldestMapping: Math.min(...Array.from(this.mappings.values()).map(m => m.timestamp)),
      newestMapping: Math.max(...Array.from(this.mappings.values()).map(m => m.timestamp))
    };
  }
}

// Enhanced position utilities for ProseMirror
export class PositionUtils {
  // Convert string offset to ProseMirror position with validation
  static stringOffsetToPos(doc, offset, validate = true) {
    if (offset < 0) return 0;
    
    let pos = 0;
    let currentOffset = 0;
    let found = false;
    
    doc.descendants((node, nodePos) => {
      if (found) return false;
      
      if (node.isText) {
        if (currentOffset + node.text.length >= offset) {
          pos = nodePos + (offset - currentOffset);
          found = true;
          return false;
        }
        currentOffset += node.text.length;
      }
      return true;
    });
    
    if (validate && !found) {
      console.warn(`String offset ${offset} beyond document end`);
      return doc.content.size;
    }
    
    return pos;
  }

  // Convert ProseMirror position to string offset
  static posToStringOffset(doc, pos) {
    if (pos < 0) return 0;
    if (pos > doc.content.size) return doc.textContent.length;
    
    let offset = 0;
    let found = false;
    
    doc.descendants((node, nodePos) => {
      if (found) return false;
      
      if (node.isText) {
        if (pos <= nodePos + node.text.length) {
          offset += Math.max(0, pos - nodePos);
          found = true;
          return false;
        }
        offset += node.text.length;
      }
      return true;
    });
    
    return offset;
  }

  // Find the deepest node at a position
  static nodeAtPos(doc, pos) {
    try {
      const resolved = doc.resolve(pos);
      return {
        node: resolved.parent,
        pos: resolved.pos,
        depth: resolved.depth,
        offset: resolved.parentOffset
      };
    } catch (error) {
      console.warn(`Invalid position ${pos}:`, error);
      return null;
    }
  }

  // Get text content between positions with error handling
  static getTextBetween(doc, from, to, separator = '') {
    try {
      if (from >= to) return '';
      if (from < 0) from = 0;
      if (to > doc.content.size) to = doc.content.size;
      
      return doc.textBetween(from, to, separator);
    } catch (error) {
      console.warn(`Failed to get text between ${from}-${to}:`, error);
      return '';
    }
  }

  // Validate that a position is safe to use
  static isValidPosition(doc, pos) {
    try {
      if (pos < 0 || pos > doc.content.size) return false;
      doc.resolve(pos);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Find the closest valid position
  static findValidPosition(doc, pos, direction = 1) {
    if (this.isValidPosition(doc, pos)) return pos;
    
    const step = direction > 0 ? 1 : -1;
    const limit = direction > 0 ? doc.content.size : 0;
    
    for (let testPos = pos; testPos !== limit; testPos += step) {
      if (this.isValidPosition(doc, testPos)) {
        return testPos;
      }
    }
    
    return direction > 0 ? doc.content.size : 0;
  }

  // Get word boundaries around a position
  static getWordBoundaries(doc, pos) {
    const text = doc.textContent;
    const offset = this.posToStringOffset(doc, pos);
    
    // Find word start
    let start = offset;
    while (start > 0 && /\w/.test(text[start - 1])) {
      start--;
    }
    
    // Find word end  
    let end = offset;
    while (end < text.length && /\w/.test(text[end])) {
      end++;
    }
    
    return {
      from: this.stringOffsetToPos(doc, start),
      to: this.stringOffsetToPos(doc, end),
      word: text.slice(start, end)
    };
  }

  // Get line boundaries around a position
  static getLineBoundaries(doc, pos) {
    const text = doc.textContent;
    const offset = this.posToStringOffset(doc, pos);
    
    // Find line start
    let start = offset;
    while (start > 0 && text[start - 1] !== '\n') {
      start--;
    }
    
    // Find line end
    let end = offset;
    while (end < text.length && text[end] !== '\n') {
      end++;
    }
    
    return {
      from: this.stringOffsetToPos(doc, start),
      to: this.stringOffsetToPos(doc, end),
      line: text.slice(start, end)
    };
  }

  // Calculate distance between two positions
  static distance(doc, pos1, pos2) {
    try {
      const resolved1 = doc.resolve(pos1);
      const resolved2 = doc.resolve(pos2);
      
      // Simple distance calculation
      return Math.abs(pos2 - pos1);
    } catch (error) {
      console.warn(`Failed to calculate distance between ${pos1} and ${pos2}:`, error);
      return Infinity;
    }
  }
}

// Position tracking for suggestions
export class SuggestionPositionTracker {
  constructor() {
    this.trackedSuggestions = new Map();
    this.mapper = new PositionMapper();
  }

  // Track a suggestion's position
  trackSuggestion(suggestionId, from, to, text) {
    this.trackedSuggestions.set(suggestionId, {
      originalFrom: from,
      originalTo: to,
      currentFrom: from,
      currentTo: to,
      originalText: text,
      isValid: true,
      lastUpdate: Date.now()
    });
  }

  // Update positions after a transaction
  updatePositions(tr) {
    const mappingId = this.mapper.createMapping(tr);
    
    for (const [suggestionId, suggestion] of this.trackedSuggestions) {
      try {
        const newFrom = this.mapper.mapPosition(suggestion.currentFrom, mappingId, 1);
        const newTo = this.mapper.mapPosition(suggestion.currentTo, mappingId, -1);
        
        // Check if the suggestion was deleted
        if (this.mapper.wasDeleted(suggestion.currentFrom, mappingId) || 
            this.mapper.wasDeleted(suggestion.currentTo, mappingId)) {
          suggestion.isValid = false;
        } else {
          suggestion.currentFrom = newFrom;
          suggestion.currentTo = newTo;
          suggestion.lastUpdate = Date.now();
        }
      } catch (error) {
        console.warn(`Failed to update position for suggestion ${suggestionId}:`, error);
        suggestion.isValid = false;
      }
    }
  }

  // Get current position of a suggestion
  getSuggestionPosition(suggestionId) {
    const suggestion = this.trackedSuggestions.get(suggestionId);
    return suggestion && suggestion.isValid ? {
      from: suggestion.currentFrom,
      to: suggestion.currentTo,
      isValid: suggestion.isValid
    } : null;
  }

  // Remove invalid suggestions
  cleanup() {
    for (const [suggestionId, suggestion] of this.trackedSuggestions) {
      if (!suggestion.isValid) {
        this.trackedSuggestions.delete(suggestionId);
      }
    }
    
    this.mapper.cleanup();
  }

  // Get all valid suggestions
  getValidSuggestions() {
    return Array.from(this.trackedSuggestions.entries())
      .filter(([_, suggestion]) => suggestion.isValid)
      .map(([id, suggestion]) => ({ id, ...suggestion }));
  }
}

export default {
  PositionMapper,
  PositionUtils,
  SuggestionPositionTracker
};