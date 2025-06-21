import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { message, analysisHistory = [], creativeSignature = {} } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, error: 'Source message is required' });
        }

        const systemPrompt = `You are a world-class creative coach and developmental editor. Your task is to synthesize a user's creative work and process into a comprehensive, actionable, and insightful report. You are an expert in narrative structure, character development, and the psychology of creativity.`;

        const userPrompt = `Generate a "Comprehensive Creative Analysis" report.

        ### CONTEXT ###
        - **User's Current Creative Signature:** ${JSON.stringify(creativeSignature, null, 2)}
        - **Source User Message (The focus of this analysis):** "${message}"
        - **Recent Analysis History (Snapshots from recent messages):** ${JSON.stringify(analysisHistory.slice(0, 3), null, 2)}
        
        ### TASK ###
        Based on ALL the context, generate a 6-part report. Be insightful, encouraging, and provide concrete, actionable advice.

        RETURN ONLY A JSON OBJECT with this exact structure, with no extra commentary:
        {
          "report": {
            "contextAndSource": {
              "analysisDate": "${new Date().toLocaleString()}",
              "sourceMessage": "Briefly summarize the user's source message.",
              "relatedContext": ["Identify 1-2 key ideas from the chat history that connect to this source message."]
            },
            "expandedCreativeAnalysis": {
              "primaryPatterns": [
                {"pattern": "e.g., Predictive Processing", "strength": "Dominant|Emerging", "comment": "Explain WHY this pattern is present in the source message."},
                {"pattern": "e.g., Active Imagination", "strength": "Dominant|Emerging", "comment": "Explain WHY this pattern is present in the source message."}
              ],
              "creativeDevelopmentArc": "Describe the user's creative trajectory. Are they moving from simple to complex? From exploration to convergence?"
            },
            "storyDevelopmentIntelligence": {
              "narrativeProgression": "Assess the story's current momentum. Is it advancing? What is the core engine of the plot right now?",
              "archetypalJourney": "Identify the primary archetypal journey at play (e.g., The Hero's Journey, a tragic fall, a mystery).",
              "thematicDeepening": "What core themes are emerging? How can the user deepen them?"
            },
            "personalizedCreativeGuidance": {
              "basedOnSignature": "Provide guidance tailored to the user's overall Creative Signature. How can they leverage their strengths?",
              "nextCreativeLeap": ["Suggest 2-3 specific, actionable 'next steps' to push the story forward creatively."],
              "techniquesForStyle": ["Recommend 2 creative techniques (e.g., 'Character Hot-Seating', 'Reverse Outlining') that fit their signature."]
            },
            "creativeSignatureEvolution": {
              "sessionComparison": ["Compare this message to their overall signature. Is it a typical example, or a new evolution?"],
              "creativeSignatureUpdate": ["Describe how this interaction has updated their signature. e.g., 'This session strengthened your tendency toward thematic exploration.'"]
            },
            "integrationAndNextSteps": {
              "immediateStoryDevelopment": ["List 2-3 concrete tasks for their story (e.g., 'Write the scene where X confronts Y')."],
              "creativeTechniquePractice": ["Suggest one of the recommended techniques to practice right now."]
            }
          }
        }`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.5,
            max_tokens: 2000,
        });

        const responseText = completion.choices[0]?.message?.content?.trim();
        if (!responseText) {
            throw new Error('No response from OpenAI');
        }

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const report = JSON.parse(jsonMatch[0]);
            res.status(200).json({ success: true, ...report });
        } else {
            throw new Error('No JSON found in response');
        }

    } catch (error) {
        console.error('Full creative analysis error:', error);
        res.status(500).json({ success: false, error: error.message || 'Full analysis failed' });
    }
} 