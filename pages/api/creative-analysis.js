import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { message, chatHistory, userProfile, creativeSignature } = req.body;

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
        const response = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: analysisPrompt,
            max_tokens: 800,
            temperature: 0.3,
            n: 1,
        });

        const insights = JSON.parse(response.data.choices[0].text.trim());
        res.status(200).json({ success: true, insights });

    } catch (error) {
        console.error('OpenAI API error:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, error: 'Failed to get creative analysis.' });
    }
} 