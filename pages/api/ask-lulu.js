// /pages/api/ask-lulu.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const { suggestion, why, manuscript, question } = req.body
  if (!suggestion || !manuscript || !question) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }
  try {
    const systemPrompt = `
You are Lulu, a friendly but expert writing mentor and editorial AI.
Given a manuscript, an editorial suggestion, and a specific user question, answer clearly, helpfully, and with as much context as possible.
Reference relevant parts of the user's manuscript, be specific, and always provide a practical, actionable answer.
Do NOT repeat the suggestion unless necessary.
If the user asks for an example, give one from their manuscript or suggest a possible rewrite.
`
    const userPrompt = `
--- Manuscript (excerpt/section) ---
${manuscript.slice(0, 2000)}

--- Editorial Suggestion ---
${suggestion}

${why ? `Reasoning: ${why}` : ''}
--- User Question ---
${question}
---
Please provide a concise but specific, context-aware answer.
`
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 260,
        temperature: 0.65,
      })
    })
    const data = await response.json()
    const answer = data?.choices?.[0]?.message?.content?.trim()
    res.status(200).json({ answer })
  } catch (e) {
    res.status(500).json({ error: 'Lulu Q&A failed.' })
  }
}
