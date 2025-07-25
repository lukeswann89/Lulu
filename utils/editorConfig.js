// /utils/editorConfig.js

export const EDIT_TYPES = [
  { type: 'Full Edit', icon: '🪄', help: "A comprehensive edit across all types.", color: 'bg-purple-50', iconColor: 'text-purple-500', hl: 'ring-purple-400' },
  { type: 'Developmental', icon: '🖼️', help: "Big picture: plot, characters, theme.", color: 'bg-blue-50', iconColor: 'text-blue-400', hl: 'ring-blue-400' },
  { type: 'Structural', icon: '🪜', help: "Scene/chapter order, pacing, flow.", color: 'bg-green-50', iconColor: 'text-green-400', hl: 'ring-green-400' },
  { type: 'Line', icon: '📜', help: "Sentence clarity, word choice.", color: 'bg-yellow-50', iconColor: 'text-yellow-400', hl: 'ring-yellow-400' },
  { type: 'Copy', icon: '🔍', help: "Grammar, consistency, repetition.", color: 'bg-teal-50', iconColor: 'text-teal-400', hl: 'ring-teal-400' },
  { type: 'Proof', icon: '🩹', help: "Typos, formatting, last details.", color: 'bg-pink-50', iconColor: 'text-pink-400', hl: 'ring-pink-400' }
];

export const EDIT_DEPTHS = ['Light', 'Pro', 'Intensive'];
export const PROFILES = ['Voice', 'Professional', 'Publisher: Penguin', 'Reader: YA', 'Creative'];

export const EDIT_TYPE_TOOLTIP = 
`🪄 Full Edit: A comprehensive edit across all types.
🖼️ Developmental: Big picture—plot, characters, theme.
🪜 Structural: Scene/chapter order, pacing, flow.
📜 Line: Sentence clarity, word choice.
🔍 Copy: Grammar, consistency, repetition.
🩹 Proof: Typos, formatting, last details.`;


// --- NEW: The central definition for our workflows ---
// This object is the "Blueprint" our state engine uses to manage the Cascade.
export const WORKFLOWS = {
  pro: {
    name: 'Pro Edit',
    description: 'Full professional publishing workflow',
    phases: ['assessment', 'developmental', 'structural', 'line', 'copy', 'proof', 'complete'],
  },
  macro: {
    name: 'Macro Edit', 
    description: 'High-level editorial review and recommendations',
    phases: ['assessment', 'general', 'recommendations'],
  },
  micro: {
    name: 'Micro Edit',
    description: 'Line, copy and proof editing only', 
    phases: ['assessment', 'line', 'copy', 'proof', 'complete'],
  }
};


export function getEditMeta(type) {
  return EDIT_TYPES.find(e => e.type === type) || EDIT_TYPES[0];
}