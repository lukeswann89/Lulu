// /api/editorial-plan.js
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// This is the new, powerful prompt for synthesising the Editorial Plan.
function buildEditorialPlanPrompt({ manuscript, writerNotes }) {
  return `
You are Lulu, an expert literary editor conducting a professional consultation with a writer.
Your task is to analyse a manuscript and the writer's notes, and from them, create a unified "Editorial Plan."
You must also pre-generate all the specific, line-level edits required to execute this plan.

You will be given two pieces of information:
1.  MANUSCRIPT: The text to be analysed.
2.  WRITER'S NOTES: A list of goals and instructions from the writer.

Your task has two parts that must be performed in a single process:
Part 1: Create the Editorial Plan. Synthesise the WRITER'S NOTES with your own expert analysis of the MANUSCRIPT to create a high-level checklist of editorial goals.
Part 2: Pre-generate the Specific Edits. Based on your complete analysis, generate a detailed list of all the specific, line-level suggestions needed to execute the plan and fix any other errors.

Your entire response MUST be a single, valid JSON object with two top-level keys: "editorialPlan" and "suggestionPayload".

---
RULES FOR "editorialPlan":
This must be an array of objects. Each object represents a single, high-level goal. For each goal:
- "id": A unique identifier (e.g., "goal_01").
- "source": Either "Writer" (if derived from the writer's notes) or "Lulu" (if derived from your own analysis).
- "goal": A concise, clear string describing the editorial goal (e.g., "Change character name from John to David.").
- "isSelected": Set this to true by default.

---
RULES FOR "suggestionPayload":
This must be an array of specific, atomic, line-level suggestion objects. For each suggestion:
- "id": A unique identifier (e.g., "sug_01").
- "editType": The type of edit (e.g., "Line", "Copy", "Developmental").
- "original": The exact, minimal text to be replaced.
- "suggestion": The replacement text.
- "why": A brief justification for the change.
- "severity": Classify the edit as either "critical" (objective errors like typos, grammar mistakes) or "suggestion" (stylistic improvements like word choice, flow).
- "impacts": (Optional) An array of other suggestion "id"s that this suggestion would make redundant.

---
MANUSCRIPT:
${manuscript}

---
WRITER'S NOTES:
${writerNotes}
  `.trim();
}

// The main API handler for "The Planner"
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { manuscriptText, writerNotes } = req.body;

  if (!manuscriptText) {
    return res.status(400).json({ error: 'Missing manuscript text.' });
  }

  try {
    const prompt = buildEditorialPlanPrompt({
      manuscript: manuscriptText,
      writerNotes: writerNotes || 'No specific notes provided.' // Provide a default
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      // Instruct the AI to return a guaranteed JSON object
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const result = completion.choices[0].message.content;
    const parsedJson = JSON.parse(result);

    // Return the full two-part object to the client
    return res.status(200).json(parsedJson);

  } catch (error) {
    console.error('Error fetching Editorial Plan from OpenAI:', error);
    return res.status(500).json({ error: 'Failed to generate Editorial Plan.' });
  }
}