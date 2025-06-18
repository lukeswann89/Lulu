// /api/lulu-highlights.js - NEW API ENDPOINT
// Modify your existing /api/specific-edits.js or create this new endpoint

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { text, editTypes = ['suggestion'], options = {} } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Text is required' });
    }

    // Your existing AI call (modify as needed)
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are Lulu, an expert writing mentor. Analyze the text and provide specific editing suggestions.
            
            Return suggestions in this EXACT JSON format:
            [
              {
                "originalText": "exact text to find",
                "suggestionText": "replacement text", 
                "editType": "grammar|style|structure|suggestion|developmental|line|copy",
                "reason": "brief explanation",
                "startPos": 0,
                "endPos": 10
              }
            ]
            
            Focus on these edit types: ${editTypes.join(', ')}
            
            Rules:
            - originalText must match EXACTLY what appears in the source
            - suggestionText should be a clear improvement
            - Choose appropriate editType
            - Keep suggestions actionable and specific
            - Return valid JSON array only`
          },
          {
            role: 'user',
            content: `Please analyze this text and provide editing suggestions:\n\n${text}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let suggestions = [];

    try {
      // Parse AI response
      const aiContent = aiData.choices[0]?.message?.content || '[]';
      suggestions = JSON.parse(aiContent);
      
      // Validate and clean suggestions
      suggestions = suggestions.filter(suggestion => 
        suggestion.originalText && 
        suggestion.suggestionText && 
        text.includes(suggestion.originalText)
      );

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      
      // Fallback: create some basic suggestions
      suggestions = generateFallbackSuggestions(text);
    }

    // Transform for highlight manager format
    const highlights = suggestions.map((suggestion, index) => ({
      id: `ai_${Date.now()}_${index}`,
      original: suggestion.originalText,
      replacement: suggestion.suggestionText,
      type: suggestion.editType || 'suggestion',
      reason: suggestion.reason || 'AI suggested improvement',
      confidence: 0.8,
      source: 'ai'
    }));

    console.log(`✅ Generated ${highlights.length} AI suggestions`);

    res.status(200).json({
      success: true,
      suggestions: highlights,
      meta: {
        textLength: text.length,
        editTypes: editTypes,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('AI suggestions error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

// Fallback suggestions for when AI fails
function generateFallbackSuggestions(text) {
  const fallbackSuggestions = [];
  
  // Common writing improvements
  const patterns = [
    {
      find: /\bvery\s+(\w+)/gi,
      replace: (match, word) => getStrongerWord(word),
      type: 'style',
      reason: 'Use stronger words instead of "very" + adjective'
    },
    {
      find: /\ba lot of\b/gi,
      replace: 'many',
      type: 'grammar',
      reason: 'More concise phrasing'
    },
    {
      find: /\bin order to\b/gi,
      replace: 'to',
      type: 'structure',
      reason: 'Eliminate unnecessary words'
    },
    {
      find: /\bthat\s+(?=\w)/gi,
      replace: '',
      type: 'structure',
      reason: 'Remove unnecessary "that"'
    }
  ];

  patterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern.find)];
    matches.forEach(match => {
      const originalText = match[0];
      const replacement = typeof pattern.replace === 'function' 
        ? pattern.replace(match[0], match[1]) 
        : pattern.replace;
      
      if (replacement && replacement !== originalText) {
        fallbackSuggestions.push({
          originalText,
          suggestionText: replacement,
          editType: pattern.type,
          reason: pattern.reason
        });
      }
    });
  });

  return fallbackSuggestions;
}

// Helper for stronger word replacements
function getStrongerWord(word) {
  const strongerWords = {
    'good': 'excellent',
    'bad': 'terrible',
    'big': 'enormous',
    'small': 'tiny',
    'nice': 'wonderful',
    'pretty': 'beautiful',
    'ugly': 'hideous',
    'fast': 'rapid',
    'slow': 'sluggish'
  };
  
  return strongerWords[word.toLowerCase()] || word;
}