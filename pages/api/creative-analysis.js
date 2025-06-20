import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { message, chatHistory = [], userProfile = {} } = req.body;

    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required',
        insights: getDefaultInsights()
      });
    }

    const systemPrompt = `You are an advanced Creative Process Analyst that understands and applies 20+ scientific theories of creativity in real-time. Your role is to analyze chat messages and detect creative patterns invisibly.

THEORETICAL FRAMEWORK YOU MONITOR:
- NEUROSCIENCE: Predictive Processing, Embodied Cognition, Salience Network, Cognitive Load, Default Mode Network
- CONSCIOUSNESS: Flow States, Liminal Spaces, Hypnagogic States, Altered Consciousness  
- PSYCHOLOGY: Active Imagination, Complex Theory, Archetypal Patterns, Object Relations
- PROCESS: Process Philosophy, Biomimicry, Complexity Theory, Autopoiesis
- ADVANCED: Quantum Cognition, Integrated Information Theory, 4E Cognition, Metamodern Aesthetics

ANALYSIS TASKS:
1. Detect which creative theories are active in the user's response
2. Identify their dominant creative style (character/plot/theme/world-driven)
3. Assess their cognitive state (flow/analytical/exploratory/blocked)
4. Suggest canvas updates based on detected patterns
5. Build insights for their evolving creative signature

RESPONSE MODE: Return structured analysis only, no conversational text.

Be subtle, insightful, and focus on patterns that will help the user understand their creative process better.`;

    const analysisPrompt = `ANALYZE THIS CREATIVE EXCHANGE:

User Profile: ${JSON.stringify(userProfile, null, 2)}

Recent Context:
${chatHistory.slice(-5).map(msg => `${msg.sender}: ${msg.message}`).join('\n')}

Current AI Response to Analyze:
"${message}"

RETURN ONLY A JSON OBJECT with this exact structure:
{
  "dominantPatterns": ["pattern1", "pattern2", "pattern3"],
  "creativeStyle": "character-driven|plot-driven|theme-driven|world-driven",
  "cognitiveState": "flow|analytical|exploratory|blocked",
  "storyElements": {
    "characterFocus": 0-100,
    "plotDevelopment": 0-100,
    "themeExploration": 0-100,
    "worldBuilding": 0-100
  },
  "canvasUpdates": {
    "character": "suggested insight or empty string",
    "plot": "suggested insight or empty string", 
    "world": "suggested insight or empty string",
    "themes": "suggested insight or empty string",
    "voice": "suggested insight or empty string"
  },
  "signatureInsights": {
    "detectedPatterns": ["pattern1", "pattern2"],
    "suggestedTechniques": ["technique1", "technique2"],
    "creativeTriggers": ["trigger1", "trigger2"]
  }
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: analysisPrompt }
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let insights;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText);
      throw new Error('Invalid response format from OpenAI');
    }

    // Validate and sanitize the insights
    const validatedInsights = validateAndSanitizeInsights(insights);

    return res.status(200).json({
      success: true,
      insights: validatedInsights
    });

  } catch (error) {
    console.error('Creative analysis error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Analysis failed',
      insights: getDefaultInsights()
    });
  }
}

// Helper function to validate and sanitize insights
function validateAndSanitizeInsights(insights) {
  const defaultInsights = getDefaultInsights();
  
  if (!insights) return defaultInsights;

  return {
    dominantPatterns: Array.isArray(insights.dominantPatterns) 
      ? insights.dominantPatterns.slice(0, 5) 
      : defaultInsights.dominantPatterns,
    
    creativeStyle: ['character-driven', 'plot-driven', 'theme-driven', 'world-driven'].includes(insights.creativeStyle)
      ? insights.creativeStyle 
      : defaultInsights.creativeStyle,
    
    cognitiveState: ['flow', 'analytical', 'exploratory', 'blocked'].includes(insights.cognitiveState)
      ? insights.cognitiveState 
      : defaultInsights.cognitiveState,
    
    storyElements: {
      characterFocus: Math.max(0, Math.min(100, Number(insights.storyElements?.characterFocus) || 0)),
      plotDevelopment: Math.max(0, Math.min(100, Number(insights.storyElements?.plotDevelopment) || 0)),
      themeExploration: Math.max(0, Math.min(100, Number(insights.storyElements?.themeExploration) || 0)),
      worldBuilding: Math.max(0, Math.min(100, Number(insights.storyElements?.worldBuilding) || 0))
    },
    
    canvasUpdates: {
      character: String(insights.canvasUpdates?.character || ''),
      plot: String(insights.canvasUpdates?.plot || ''),
      world: String(insights.canvasUpdates?.world || ''),
      themes: String(insights.canvasUpdates?.themes || ''),
      voice: String(insights.canvasUpdates?.voice || '')
    },
    
    signatureInsights: {
      detectedPatterns: Array.isArray(insights.signatureInsights?.detectedPatterns) 
        ? insights.signatureInsights.detectedPatterns.slice(0, 3) 
        : defaultInsights.signatureInsights.detectedPatterns,
      suggestedTechniques: Array.isArray(insights.signatureInsights?.suggestedTechniques) 
        ? insights.signatureInsights.suggestedTechniques.slice(0, 3) 
        : defaultInsights.signatureInsights.suggestedTechniques,
      creativeTriggers: Array.isArray(insights.signatureInsights?.creativeTriggers) 
        ? insights.signatureInsights.creativeTriggers.slice(0, 3) 
        : defaultInsights.signatureInsights.creativeTriggers
    }
  };
}

// Default insights structure for fallback
function getDefaultInsights() {
  return {
    dominantPatterns: [],
    creativeStyle: 'exploratory',
    cognitiveState: 'exploratory',
    storyElements: {
      characterFocus: 0,
      plotDevelopment: 0,
      themeExploration: 0,
      worldBuilding: 0
    },
    canvasUpdates: {
      character: '',
      plot: '',
      world: '',
      themes: '',
      voice: ''
    },
    signatureInsights: {
      detectedPatterns: [],
      suggestedTechniques: [],
      creativeTriggers: []
    }
  };
} 