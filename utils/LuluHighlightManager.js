// /utils/LuluHighlightManager.js
// Progressive Enhancement Phase 1: Working Foundation

export class LuluHighlightManager {
  constructor(editorElement, options = {}) {
    this.editor = editorElement;
    this.suggestions = [];
    this.highlightId = 0;
    this.options = {
      logEnabled: true,
      ...options
    };
    
    this.init();
  }

  init() {
    if (!this.editor) {
      throw new Error('Editor element is required');
    }
    
    // Add CSS styles if not already present
    this.injectStyles();
    this.log('LuluHighlightManager initialized', 'success');
  }

  // Logging utility
  log(message, type = 'info') {
    if (!this.options.logEnabled) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const emoji = {
      'info': 'ℹ️',
      'success': '✅', 
      'warning': '⚠️',
      'error': '❌',
      'find': '🔍',
      'highlight': '🎨',
      'click': '🖱️',
      'replace': '🔄'
    };
    
    console.log(`${emoji[type] || 'ℹ️'} ${timestamp}: ${message}`);
  }

  // Inject CSS styles for highlights
  injectStyles() {
    const styleId = 'lulu-highlight-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .lulu-highlight {
        cursor: pointer;
        border-radius: 3px;
        padding: 2px 4px;
        margin: 0 1px;
        transition: all 0.2s ease;
        position: relative;
        display: inline-block;
      }

      .lulu-highlight:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }

      .lulu-highlight-suggestion {
        background: linear-gradient(135deg, #fef3c7, #fde047);
        border: 1px solid #f59e0b;
        color: #92400e;
      }

      .lulu-highlight-suggestion:hover {
        background: linear-gradient(135deg, #fde047, #facc15);
      }

      .lulu-highlight-grammar {
        background: linear-gradient(135deg, #fecaca, #f87171);
        border: 1px solid #ef4444;
        color: #991b1b;
      }

      .lulu-highlight-grammar:hover {
        background: linear-gradient(135deg, #f87171, #ef4444);
      }

      .lulu-highlight-style {
        background: linear-gradient(135deg, #bfdbfe, #93c5fd);
        border: 1px solid #3b82f6;
        color: #1e40af;
      }

      .lulu-highlight-style:hover {
        background: linear-gradient(135deg, #93c5fd, #60a5fa);
      }

      .lulu-highlight-structure {
        background: linear-gradient(135deg, #d8b4fe, #c084fc);
        border: 1px solid #8b5cf6;
        color: #6b21a8;
      }

      .lulu-highlight-structure:hover {
        background: linear-gradient(135deg, #c084fc, #a855f7);
      }

      .lulu-highlight-developmental {
        background: linear-gradient(135deg, #ddd6fe, #c4b5fd);
        border: 1px solid #7c3aed;
        color: #5b21b6;
      }

      .lulu-highlight-line {
        background: linear-gradient(135deg, #fed7d7, #fc8181);
        border: 1px solid #e53e3e;
        color: #742a2a;
      }

      .lulu-highlight-copy {
        background: linear-gradient(135deg, #fbb6ce, #f687b3);
        border: 1px solid #d53f8c;
        color: #702459;
      }
    `;
    
    document.head.appendChild(style);
  }

  // Find all occurrences of text in the editor
  findTextInEditor(searchText) {
    const content = this.editor.textContent;
    const positions = [];
    let index = 0;

    this.log(`Searching for: "${searchText}"`, 'find');

    while ((index = content.indexOf(searchText, index)) !== -1) {
      positions.push({
        start: index,
        end: index + searchText.length,
        text: searchText
      });
      this.log(`Found "${searchText}" at position ${index}-${index + searchText.length}`, 'find');
      index += searchText.length;
    }

    return positions;
  }

  // Create a highlight element
  createHighlight(text, originalText, replacementText, className, id) {
    const span = document.createElement('span');
    span.className = `lulu-highlight lulu-highlight-${className}`;
    span.setAttribute('data-highlight-id', id);
    span.setAttribute('data-original', originalText);
    span.setAttribute('data-replacement', replacementText);
    span.setAttribute('data-type', className);
    span.setAttribute('title', `Click to replace with: "${replacementText}"`);
    
    // Set ONLY the text content
    span.textContent = text;
    
    // Add click handler
    span.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleHighlightClick(span);
    });
    
    return span;
  }

  // Handle highlight click
  handleHighlightClick(highlightElement) {
    const id = highlightElement.getAttribute('data-highlight-id');
    const originalText = highlightElement.getAttribute('data-original');
    const replacementText = highlightElement.getAttribute('data-replacement');
    
    this.log(`Clicked highlight ${id}: "${originalText}" → "${replacementText}"`, 'click');
    
    // Create replacement text node
    const textNode = document.createTextNode(replacementText);
    
    // Replace the highlight element with plain text
    highlightElement.parentNode.replaceChild(textNode, highlightElement);
    
    // Remove from suggestions array
    this.suggestions = this.suggestions.filter(s => s.id !== parseInt(id));
    
    this.log(`Replacement completed: "${originalText}" → "${replacementText}"`, 'replace');
    
    // Trigger callback if provided
    if (this.options.onReplace) {
      this.options.onReplace({
        id: parseInt(id),
        originalText,
        replacementText,
        remainingSuggestions: this.suggestions.length
      });
    }
  }

  // Apply highlights to editor content
  applyHighlights(positions, originalText, replacementText, className) {
    if (positions.length === 0) return [];

    const content = this.editor.textContent;
    
    // Sort positions in reverse order to maintain indices
    positions.sort((a, b) => b.start - a.start);
    
    const addedHighlights = [];
    
    // Create document fragment with highlights
    let lastEnd = content.length;
    const fragments = [];
    
    // Process in reverse order
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const id = ++this.highlightId;
      
      // Text after this highlight
      if (lastEnd > pos.end) {
        fragments.unshift(document.createTextNode(content.slice(pos.end, lastEnd)));
      }
      
      // The highlight itself
      const highlight = this.createHighlight(pos.text, originalText, replacementText, className, id);
      fragments.unshift(highlight);
      
      // Track suggestion
      const suggestion = {
        id,
        originalText,
        replacementText,
        className,
        position: pos
      };
      
      this.suggestions.push(suggestion);
      addedHighlights.push(suggestion);
      
      lastEnd = pos.start;
    }
    
    // Text before first highlight
    if (lastEnd > 0) {
      fragments.unshift(document.createTextNode(content.slice(0, lastEnd)));
    }
    
    // Replace editor content
    this.editor.innerHTML = '';
    fragments.forEach(fragment => this.editor.appendChild(fragment));
    
    this.log(`Applied ${positions.length} highlights for "${originalText}"`, 'highlight');
    return addedHighlights;
  }

  // Public API: Add highlight
  addHighlight(searchText, replacementText, type = 'suggestion') {
    const positions = this.findTextInEditor(searchText);
    
    if (positions.length === 0) {
      this.log(`No occurrences found for: "${searchText}"`, 'warning');
      return [];
    }
    
    const highlights = this.applyHighlights(positions, searchText, replacementText, type);
    
    // Trigger callback if provided
    if (this.options.onHighlightAdded) {
      this.options.onHighlightAdded({
        searchText,
        replacementText,
        type,
        count: highlights.length,
        highlights
      });
    }
    
    return highlights;
  }

  // Public API: Add multiple suggestions at once
  addSuggestions(suggestions) {
    const results = [];
    
    suggestions.forEach(suggestion => {
      const { original, replacement, type = 'suggestion' } = suggestion;
      const highlights = this.addHighlight(original, replacement, type);
      results.push(...highlights);
    });
    
    this.log(`Added ${results.length} total highlights from ${suggestions.length} suggestions`, 'success');
    return results;
  }

  // Public API: Clear all highlights
  clearAllHighlights() {
    this.editor.textContent = this.editor.textContent; // Removes all HTML, keeps text
    this.suggestions = [];
    this.log('All highlights cleared', 'success');
    
    // Trigger callback if provided
    if (this.options.onClear) {
      this.options.onClear();
    }
  }

  // Public API: Get current suggestions
  getSuggestions() {
    return [...this.suggestions];
  }

  // Public API: Get suggestion count by type
  getStats() {
    const stats = {
      total: this.suggestions.length,
      byType: {}
    };
    
    this.suggestions.forEach(suggestion => {
      const type = suggestion.className;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });
    
    return stats;
  }

  // Public API: Replace all occurrences (no highlighting)
  replaceAll(searchText, replacementText) {
    const content = this.editor.textContent;
    const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const newContent = content.replace(new RegExp(escapedSearch, 'g'), replacementText);
    
    if (content === newContent) {
      this.log(`No occurrences found for: "${searchText}"`, 'warning');
      return 0;
    }
    
    this.editor.textContent = newContent;
    
    const occurrences = (content.match(new RegExp(escapedSearch, 'g')) || []).length;
    this.log(`Replaced ${occurrences} occurrences of "${searchText}" with "${replacementText}"`, 'replace');
    
    return occurrences;
  }

  // Public API: Destroy manager
  destroy() {
    this.clearAllHighlights();
    this.suggestions = [];
    this.editor = null;
    this.log('LuluHighlightManager destroyed', 'info');
  }
}

// Export default for easy importing
export default LuluHighlightManager;