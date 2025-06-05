// /utils/titleGenerator.js

// Extract key action words from text
function extractActionWords(text) {
  const actionWords = [
    'shorten', 'expand', 'clarify', 'rewrite', 'rephrase', 'simplify', 'strengthen',
    'correct', 'fix', 'improve', 'enhance', 'revise', 'edit', 'change', 'modify',
    'add', 'remove', 'delete', 'replace', 'substitute', 'adjust', 'refine',
    'tighten', 'loosen', 'polish', 'smooth', 'sharpen', 'soften', 'balance'
  ];
  
  const words = text.toLowerCase().split(/\s+/);
  return actionWords.filter(word => words.includes(word));
}

// Extract subject matter from text
function extractSubject(text) {
  const subjects = [
    'dialogue', 'character', 'scene', 'paragraph', 'sentence', 'word', 'phrase',
    'description', 'action', 'setting', 'plot', 'story', 'chapter', 'section',
    'verb', 'noun', 'adjective', 'tense', 'grammar', 'punctuation', 'style',
    'tone', 'voice', 'pacing', 'flow', 'transition', 'opening', 'ending'
  ];
  
  const words = text.toLowerCase().split(/\s+/);
  return subjects.filter(subject => words.includes(subject));
}

// Generate intelligent title from suggestion and context
export function generateSuggestionTitle(suggestion, why, editType, original) {
  if (!suggestion) return 'Untitled Suggestion';
  
  // Clean up the suggestion text
  const cleanSuggestion = suggestion.replace(/^["']|["']$/g, '').trim();
  const cleanWhy = why ? why.toLowerCase() : '';
  
  // Try to extract action and subject from the why text first
  const actions = extractActionWords(cleanWhy);
  const subjects = extractSubject(cleanWhy + ' ' + cleanSuggestion);
  
  // Special handling for Writer's Edits - preserve user language
  if (editType === "Writer's Edit") {
    const userActions = extractActionWords(cleanSuggestion);
    if (userActions.length > 0) {
      const action = userActions[0];
      const subject = subjects.length > 0 ? subjects[0] : 'text';
      return `${action.charAt(0).toUpperCase() + action.slice(1)} ${subject.charAt(0).toUpperCase() + subject.slice(1)}`;
    }
  }
  
  // Grammar/technical fixes
  if (cleanWhy.includes('verb tense') || cleanWhy.includes('tense')) {
    return 'Verb Tense Correction';
  }
  if (cleanWhy.includes('grammar') || cleanWhy.includes('grammatical')) {
    return 'Grammar Fix';
  }
  if (cleanWhy.includes('consistency') && cleanWhy.includes('tense')) {
    return 'Tense Consistency';
  }
  if (cleanWhy.includes('punctuation')) {
    return 'Punctuation Fix';
  }
  if (cleanWhy.includes('spelling')) {
    return 'Spelling Correction';
  }
  
  // Style improvements
  if (cleanWhy.includes('clarity') || cleanWhy.includes('clear')) {
    return 'Clarity Enhancement';
  }
  if (cleanWhy.includes('flow') || cleanWhy.includes('smooth')) {
    return 'Flow Improvement';
  }
  if (cleanWhy.includes('concise') || cleanWhy.includes('wordy')) {
    return 'Conciseness Edit';
  }
  if (cleanWhy.includes('repetition') || cleanWhy.includes('repetitive')) {
    return 'Remove Repetition';
  }
  
  // Character/dialogue specific
  if (cleanWhy.includes('dialogue') || cleanWhy.includes('conversation')) {
    return 'Dialogue Enhancement';
  }
  if (cleanWhy.includes('character') && cleanWhy.includes('voice')) {
    return 'Character Voice';
  }
  
  // Structure/pacing
  if (cleanWhy.includes('pacing') || cleanWhy.includes('pace')) {
    return 'Pacing Adjustment';
  }
  if (cleanWhy.includes('transition')) {
    return 'Transition Improvement';
  }
  
  // Action-based titles
  if (actions.length > 0 && subjects.length > 0) {
    const action = actions[0];
    const subject = subjects[0];
    return `${action.charAt(0).toUpperCase() + action.slice(1)} ${subject.charAt(0).toUpperCase() + subject.slice(1)}`;
  }
  
  // Fallback to first few words with smart truncation
  const words = cleanSuggestion.split(/\s+/);
  if (words.length <= 4) {
    return cleanSuggestion;
  }
  
  // Find a good breaking point (after prepositions, articles, etc.)
  const breakWords = ['the', 'a', 'an', 'to', 'for', 'with', 'by', 'from', 'in', 'on', 'at'];
  let breakPoint = 4;
  
  for (let i = 3; i < Math.min(6, words.length); i++) {
    if (breakWords.includes(words[i].toLowerCase())) {
      breakPoint = i;
      break;
    }
  }
  
  const title = words.slice(0, breakPoint).join(' ');
  return title.length > 30 ? title.slice(0, 30) + '...' : title;
}

// Generate title specifically for learning logs
export function generateLogTitle(action, suggestion, editType, revision) {
  const baseTitle = generateSuggestionTitle(suggestion, '', editType);
  const actionCap = action.charAt(0).toUpperCase() + action.slice(1);
  
  if (revision && action === 'revised') {
    return `${actionCap}: ${baseTitle} → "${revision.slice(0, 20)}${revision.length > 20 ? '...' : ''}"`;
  }
  
  return `${actionCap}: ${baseTitle}`;
}

// Get short version of why for card display (full version shown in deep dive)
export function getShortWhy(why) {
  if (!why) return '';
  
  const words = why.split(/\s+/);
  if (words.length <= 12) return why;
  
  return words.slice(0, 12).join(' ') + '...';
}