import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { message, chatHistory, userProfile, creativeSignature } = req.body;

    // Validate required fields
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const analysisPrompt = `ANALYZE THIS CREATIVE EXCHANGE FOR A USER'S CREATIVE SIGNATURE:

// --- User Profile & History ---
User Profile: ${JSON.stringify(userProfile, null, 2)}
Current Creative Signature (if any): ${JSON.stringify(creativeSignature, null, 2)}

// --- Current Interaction ---
Recent Context:
${chatHistory.slice(-5).map(msg => `${msg.sender}: ${msg.message}`).join('\n')}

Current User Message to Analyze:
"${message}"

// --- TASK ---
Based on ALL the information above, perform two tasks:
1.  **Analyze the "Current User Message"**: Identify its dominant creative patterns, cognitive state, and implied story elements.
2.  **Evolve the Creative Signature**: Based on this new message, update the user's overall creative signature. If no signature exists, create one. The signature should track dominant patterns, preferred style (e.g., character-driven, plot-driven), and cognitive states (e.g., exploratory, convergent) over time.

RETURN ONLY A JSON OBJECT with this exact structure, with no extra commentary:
{
  "analysis": {
    "dominantPatterns": ["pattern1", "pattern2"],
    "creativeStyle": "e.g., character-driven",
    "cognitiveState": "e.g., exploratory",
    "storyElements": {
      "characterFocus": 50,
      "plotDevelopment": 30,
      "themeExploration": 40,
      "worldBuilding": 20
    },
    "canvasUpdates": {
      "character": "Suggested character update.",
      "plot": "Suggested plot update.",
      "world": "Suggested world update.",
      "themes": "Suggested themes update.",
      "voice": "Suggested voice update."
    }
  },
  "updatedSignature": {
    "cumulativePatterns": { "pattern1": 10, "pattern2": 5 },
    "dominantStyle": "character-driven",
    "typicalCognitiveStates": { "exploratory": 12, "convergent": 3 },
    "lastAnalyzed": "${new Date().toISOString()}"
  }
}`;

    try {
        console.log('Making OpenAI API call...');
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a creative writing analysis assistant. Always respond with valid JSON only."
                },
                {
                    role: "user",
                    content: analysisPrompt
                }
            ],
            max_tokens: 800,
            temperature: 0.3,
        });

        console.log('OpenAI response received:', response.choices[0].message.content);
        
        const responseText = response.choices[0].message.content.trim();
        if (!responseText) {
            throw new Error('Empty response from OpenAI');
        }

        const insights = JSON.parse(responseText);
        console.log('Parsed insights successfully');
        res.status(200).json({ success: true, insights });

    } catch (error) {
        console.error('Creative analysis error:', error);
        
        // Check if it's a JSON parsing error
        if (error instanceof SyntaxError) {
            console.error('JSON parsing failed. Response was:', error.message);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to parse OpenAI response as JSON',
                details: error.message 
            });
        }
        
        // Check if it's an OpenAI API error
        if (error.response) {
            console.error('OpenAI API error:', error.response.data);
            return res.status(500).json({ 
                success: false, 
                error: 'OpenAI API error',
                details: error.response.data 
            });
        }
        
        // Generic error
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get creative analysis',
            details: error.message 
        });
    }
} 