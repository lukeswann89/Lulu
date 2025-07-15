// /utils/suggestionIdGenerator.js
// Content-addressable suggestion ID generation system

import { createHash } from 'crypto';

/**
 * Generate a deterministic, content-based suggestion ID
 * @param {string} original - Original text to replace
 * @param {string} replacement - Replacement text
 * @param {Object} context - Additional context (editType, position hints, etc.)
 * @returns {string} Unique suggestion ID
 */
export function generateSuggestionId(original, replacement, context = {}) {
  const normalized = normalizeText(original);
  const contentHash = hashContent(normalized + '→' + replacement);
  const contextHash = hashContext(context);
  const timestamp = Date.now().toString(36);
  
  return `sug_${contentHash}_${contextHash}_${timestamp}`;
}

/**
 * Generate a shorter fingerprint for quick matching
 * @param {string} original - Original text
 * @param {string} replacement - Replacement text
 * @returns {string} Short fingerprint
 */
export function generateFingerprint(original, replacement) {
  const normalized = normalizeText(original);
  const content = normalized + '→' + replacement;
  return hashContent(content).substring(0, 12);
}

/**
 * Normalize text for consistent matching
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/[''`]/g, "'")         // Normalize apostrophes
    .replace(/[""]/g, '"')          // Normalize quotes
    .replace(/[–—]/g, '-')          // Normalize dashes
    .replace(/…/g, '...')           // Normalize ellipsis
    .trim()
    .toLowerCase();
}

/**
 * Create content hash using a simple but effective algorithm
 * @param {string} content - Content to hash
 * @returns {string} Hash string
 */
function hashContent(content) {
  if (!content) return '00000000';
  
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36).padStart(8, '0');
}

/**
 * Create context hash for additional uniqueness
 * @param {Object} context - Context object
 * @returns {string} Context hash
 */
function hashContext(context) {
  const contextString = JSON.stringify({
    editType: context.editType || 'Line',
    confidence: context.confidence || 1.0,
    priority: context.priority || 0
  });
  
  return hashContent(contextString).substring(0, 4);
}

/**
 * Extract metadata from a suggestion ID
 * @param {string} suggestionId - Suggestion ID to parse
 * @returns {Object} Metadata object
 */
export function parseSuggestionId(suggestionId) {
  const parts = suggestionId.split('_');
  
  if (parts.length !== 4 || parts[0] !== 'sug') {
    return { valid: false };
  }
  
  return {
    valid: true,
    contentHash: parts[1],
    contextHash: parts[2],
    timestamp: parseInt(parts[3], 36),
    created: new Date(parseInt(parts[3], 36))
  };
}

/**
 * Check if two suggestion IDs are likely the same content
 * @param {string} id1 - First suggestion ID
 * @param {string} id2 - Second suggestion ID
 * @returns {boolean} True if content hashes match
 */
export function areSimilarSuggestions(id1, id2) {
  const meta1 = parseSuggestionId(id1);
  const meta2 = parseSuggestionId(id2);
  
  if (!meta1.valid || !meta2.valid) return false;
  
  return meta1.contentHash === meta2.contentHash;
}

/**
 * Generate a legacy-compatible ID for backwards compatibility
 * @param {number} index - Index in array
 * @param {string} original - Original text
 * @returns {string} Legacy-style ID
 */
export function generateLegacyId(index, original) {
  const shortHash = hashContent(normalizeText(original)).substring(0, 6);
  return `specific_${index}_${shortHash}_${Date.now()}`;
}

/**
 * Validate suggestion ID format
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid format
 */
export function isValidSuggestionId(id) {
  if (!id || typeof id !== 'string') return false;
  
  // Check for new format
  if (id.startsWith('sug_')) {
    return parseSuggestionId(id).valid;
  }
  
  // Check for legacy format
  if (id.startsWith('specific_')) {
    const parts = id.split('_');
    return parts.length === 4 && !isNaN(parseInt(parts[1]));
  }
  
  return false;
}

/**
 * Create suggestion metadata for tracking
 * @param {string} original - Original text
 * @param {string} replacement - Replacement text
 * @param {Object} context - Additional context
 * @returns {Object} Suggestion metadata
 */
export function createSuggestionMetadata(original, replacement, context = {}) {
  const fingerprint = generateFingerprint(original, replacement);
  const normalizedOriginal = normalizeText(original);
  
  return {
    fingerprint,
    normalizedOriginal,
    originalLength: original.length,
    replacementLength: replacement.length,
    editType: context.editType || 'Line',
    confidence: context.confidence || 1.0,
    created: new Date().toISOString(),
    textComplexity: calculateTextComplexity(original),
    changeType: classifyChange(original, replacement)
  };
}

/**
 * Calculate text complexity score for matching algorithms
 * @param {string} text - Text to analyze
 * @returns {number} Complexity score (0-1)
 */
function calculateTextComplexity(text) {
  if (!text) return 0;
  
  const uniqueChars = new Set(text.toLowerCase()).size;
  const length = text.length;
  const words = text.split(/\s+/).length;
  
  // Simple complexity score based on character diversity and length
  return Math.min(1, (uniqueChars / 26) * 0.5 + Math.min(words / 10, 0.5));
}

/**
 * Classify the type of change for better matching
 * @param {string} original - Original text
 * @param {string} replacement - Replacement text
 * @returns {string} Change classification
 */
function classifyChange(original, replacement) {
  if (!original || !replacement) return 'unknown';
  
  const origWords = original.split(/\s+/);
  const replWords = replacement.split(/\s+/);
  
  if (origWords.length === replWords.length) {
    return 'substitution';
  } else if (replacement.length > original.length) {
    return 'expansion';
  } else {
    return 'reduction';
  }
}

export default {
  generateSuggestionId,
  generateFingerprint,
  normalizeText,
  parseSuggestionId,
  areSimilarSuggestions,
  generateLegacyId,
  isValidSuggestionId,
  createSuggestionMetadata
};