// pages/api/sentence-level-edits.js

// --- ARCHITECT'S NOTE: New cascade-specific sentence-level editing endpoint ---
// This is separate from specific-edits.js to isolate the cascade functionality

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, editTypes, model } = req.body;

  console.log('[API /sentence-level-edits] Request received:', {
    textLength: text?.length || 0,
    editTypes,
    model
  });

  if (!text) {
    return res.status(400).json({ error: 'Missing manuscript text.' });
  }

  // --- TESTING MODE: Return mock suggestions to verify the flow ---
  try {
    console.log(`[API /sentence-level-edits] Processing ${editTypes?.join(', ')} edits for cascade workflow`);

    // Mock suggestions based on the edit type requested
    const mockSuggestions = [];

    if (editTypes?.includes('Line')) {
      mockSuggestions.push({
        id: 'line-1',
        original: 'ran her hand through her hair',
        suggestion: 'swept her fingers through her hair',
        why: 'More vivid and specific verb choice',
        editType: 'Line',
        from: 0,
        to: 0
      });
      mockSuggestions.push({
        id: 'line-2',
        original: 'focused her pacing gaze',
        suggestion: 'fixed her restless gaze',
        why: 'Clearer and more precise description',
        editType: 'Line',
        from: 0,
        to: 0
      });
    }

    if (editTypes?.includes('Copy')) {
      mockSuggestions.push({
        id: 'copy-1',
        original: 'And what have you done',
        suggestion: 'What have you done',
        why: 'Remove unnecessary coordinating conjunction',
        editType: 'Copy',
        from: 0,
        to: 0
      });
    }

    if (editTypes?.includes('Proofreading')) {
      mockSuggestions.push({
        id: 'proof-1',
        original: 'most important to you?"',
        suggestion: 'most important to you?"',
        why: 'Correct punctuation placement',  
        editType: 'Proofreading',
        from: 0,
        to: 0
      });
    }

    console.log(`[API /sentence-level-edits] Returning ${mockSuggestions.length} mock suggestions for testing`);

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    return res.status(200).json({
      suggestions: mockSuggestions,
      mode: 'testing',
      note: 'Mock data for cascade flow testing'
    });

  } catch (err) {
    console.error('[API /sentence-level-edits] Error:', err);
    return res.status(500).json({ error: 'Sentence-level editing failed.' });
  }
} 