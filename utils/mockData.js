// Mock data for testing Stage 1A ProseMirror editor

// Sample text for testing (matches your typical manuscript content)
export const sampleManuscript = `
Aria stood at the edge of the cliff, looking down at the churning sea below. The wind was blowing very hard through her hair, and she could feel the salt spray on her face. She had been walking for hours, trying to clear her head after the argument with Marcus.

The lighthouse in the distance was sending out it's beam every few seconds, a rhythmic pulse that seemed to match her heartbeat. She thought about what her grandmother had always told her: "Sometimes you have to take a leap of faith, even when you can't see where you'll land."

Suddenly, a voice called out behind her. "Aria! Wait!" It was Marcus, running towards her with a desperate look in his eyes. She turned around slowly, not sure if she was ready to face him again.
`.trim()

// Sample suggestions that match your API response format
export const sampleSuggestions = [
  {
    id: "suggestion_1",
    editType: "Line",
    original: "looking down at the churning sea below",
    suggestion: "gazing at the turbulent waters beneath",
    why: "More vivid and precise language creates stronger imagery",
    start: 42,
    end: 78,
    state: "pending"
  },
  {
    id: "suggestion_2", 
    editType: "Copy",
    original: "The wind was blowing very hard",
    suggestion: "The wind whipped fiercely",
    why: "Eliminates weak intensifier and uses stronger verb",
    start: 80,
    end: 110,
    state: "pending"
  },
  {
    id: "suggestion_3",
    editType: "Proof",
    original: "it's beam",
    suggestion: "its beam",
    why: "Possessive 'its' doesn't use an apostrophe",
    start: 365,
    end: 374,
    state: "pending"
  },
  {
    id: "suggestion_4",
    editType: "Structural", 
    original: "She thought about what her grandmother had always told her:",
    suggestion: "Her grandmother's words echoed in her mind:",
    why: "More concise and creates better flow",
    start: 420,
    end: 478,
    state: "pending"
  },
  {
    id: "suggestion_5",
    editType: "Developmental",
    original: "She turned around slowly, not sure if she was ready to face him again.",
    suggestion: "She turned around slowly, her heart racing—was she ready to forgive him?",
    why: "Adds internal conflict and emotional depth to the moment",
    start: 720,
    end: 790,
    state: "pending"
  }
]

// More complex sample for stress testing
export const complexManuscript = `
Chapter 1: The Discovery

Dr. Sarah Chen had been working in the lab for over twelve hours straight. Her eyes were red and tired, but she couldn't stop now. The data on her computer screen was showing something that shouldn't be possible according to everything she knew about quantum physics.

"This can't be right," she muttered to herself, running her hands through her disheveled hair. She had run the calculations three times already, and each time the results were the same. The particles were behaving in a way that defied conventional understanding.

The lab was quiet except for the humming of the computers and the occasional beep from the monitoring equipment. Sarah loved these late night sessions when she could think without interruption. But tonight was different. Tonight, she might have discovered something that would change everything.

She picked up her coffee mug - now cold for the third time - and took a sip anyway. The bitter taste reminded her that she needed to eat something soon. But first, she had to verify these results one more time.
`.trim()

export const complexSuggestions = [
  {
    id: "complex_1",
    editType: "Line",
    original: "Her eyes were red and tired",
    suggestion: "Her eyes burned with fatigue", 
    why: "More vivid and concise description",
    start: 89,
    end: 115,
    state: "pending"
  },
  {
    id: "complex_2",
    editType: "Copy",
    original: "according to everything she knew about quantum physics",
    suggestion: "according to established quantum theory",
    why: "More precise and less wordy",
    start: 251,
    end: 304,
    state: "pending"
  },
  {
    id: "complex_3",
    editType: "Structural",
    original: "She had run the calculations three times already, and each time the results were the same.",
    suggestion: "Three calculations. Three identical results.",
    why: "Creates more dramatic impact through sentence variation",
    start: 401,
    end: 489,
    state: "pending"
  },
  {
    id: "complex_4",
    editType: "Developmental",
    original: "The lab was quiet except for the humming of the computers and the occasional beep from the monitoring equipment.",
    suggestion: "The lab's silence pressed around her, broken only by the steady hum of computers and sporadic electronic beeps—sounds that usually comforted her but now seemed ominous.",
    why: "Adds atmosphere and emotional context that reflects her state of mind",
    start: 595,
    end: 707,
    state: "pending"
  }
]

// Simple test case for basic functionality
export const simpleText = "The quick brown fox jumps over the lazy dog."

export const simpleSuggestions = [
  {
    id: "simple_1",
    editType: "Line",
    original: "quick brown",
    suggestion: "swift chestnut",
    why: "More sophisticated vocabulary",
    start: 4,
    end: 15,
    state: "pending"
  },
  {
    id: "simple_2",
    editType: "Copy", 
    original: "jumps over",
    suggestion: "leaps across",
    why: "Stronger verb choice",
    start: 20,
    end: 30,
    state: "pending"
  }
]

// Test data for different edit types
export const editTypeExamples = {
  Developmental: {
    text: "John walked into the room. He sat down.",
    suggestions: [{
      id: "dev_1",
      editType: "Developmental",
      original: "John walked into the room. He sat down.",
      suggestion: "John hesitated at the threshold, then entered the room with deliberate steps and settled into the nearest chair.",
      why: "Adds character motivation and specific details",
      start: 0,
      end: 38,
      state: "pending"
    }]
  },
  
  Structural: {
    text: "First this happened. Then that happened. Finally the end came.",
    suggestions: [{
      id: "struct_1",
      editType: "Structural",
      original: "First this happened. Then that happened. Finally the end came.",
      suggestion: "The sequence of events unfolded rapidly: first this, then that, until finally the inevitable conclusion arrived.",
      why: "Improves flow and connection between events",
      start: 0,
      end: 62,
      state: "pending"
    }]
  },
  
  Line: {
    text: "She was very happy and smiled a lot.",
    suggestions: [{
      id: "line_1", 
      editType: "Line",
      original: "She was very happy and smiled a lot",
      suggestion: "She beamed with joy",
      why: "More concise and vivid expression",
      start: 0,
      end: 35,
      state: "pending"
    }]
  },
  
  Copy: {
    text: "Their going to there house over they're.",
    suggestions: [
      {
        id: "copy_1",
        editType: "Copy",
        original: "Their going",
        suggestion: "They're going",
        why: "Correct contraction usage",
        start: 0,
        end: 11,
        state: "pending"
      },
      {
        id: "copy_2", 
        editType: "Copy",
        original: "there house",
        suggestion: "their house",
        why: "Correct possessive pronoun",
        start: 15,
        end: 26,
        state: "pending"
      },
      {
        id: "copy_3",
        editType: "Copy", 
        original: "they're",
        suggestion: "there",
        why: "Correct locative adverb",
        start: 32,
        end: 39,
        state: "pending"
      }
    ]
  },
  
  Proof: {
    text: "The dog's tail wagged hapily as it's owner aproached.",
    suggestions: [
      {
        id: "proof_1",
        editType: "Proof",
        original: "hapily",
        suggestion: "happily", 
        why: "Correct spelling",
        start: 25,
        end: 31,
        state: "pending"
      },
      {
        id: "proof_2",
        editType: "Proof",
        original: "it's owner",
        suggestion: "its owner",
        why: "Possessive doesn't use apostrophe",
        start: 35,
        end: 45,
        state: "pending"
      },
      {
        id: "proof_3",
        editType: "Proof",
        original: "aproached",
        suggestion: "approached",
        why: "Correct spelling",
        start: 46,
        end: 55,
        state: "pending"
      }
    ]
  }
}

// Default test configuration
export const testConfig = {
  manuscript: sampleManuscript,
  suggestions: sampleSuggestions,
  showHighlights: true,
  showNumbers: true,
  readOnly: false
}

// Helper function to get random test data
export function getRandomTestData() {
  const samples = [
    { text: sampleManuscript, suggestions: sampleSuggestions },
    { text: complexManuscript, suggestions: complexSuggestions },
    { text: simpleText, suggestions: simpleSuggestions }
  ]
  
  return samples[Math.floor(Math.random() * samples.length)]
}

// Helper function to get test data by edit type
export function getTestDataByEditType(editType) {
  return editTypeExamples[editType] || editTypeExamples.Line
}

// Export all for convenience
export default {
  sampleManuscript,
  sampleSuggestions,
  complexManuscript, 
  complexSuggestions,
  simpleText,
  simpleSuggestions,
  editTypeExamples,
  testConfig,
  getRandomTestData,
  getTestDataByEditType
}