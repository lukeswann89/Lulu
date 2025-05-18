// /pages/api/deep-dive.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const { suggestion, why, principles, manuscript } = req.body
  if (!suggestion || !manuscript) {
    res.status(400).json({ error: 'Missing suggestion or manuscript' })
    return
  }
  try {
    // Compose a rich prompt for editorial mentorship
    const systemPrompt = `
You are Lulu, a world-class writing mentor and developmental editor.
Given a novel manuscript and a specific editorial suggestion, write a detailed, specific, and actionable "Mentor Insight" to help the writer understand the recommendation and improve their craft.
Draw directly on context from the manuscript, explain the 'why', and reference writing principles if possible.
The answer should be 3-6 sentences, tailored to the user's story, NOT generic.
NEVER copy-paste the user's suggestion; always add further value.
`
    const userPrompt = `
--- Manuscript (excerpt/section) ---
${manuscript.slice(0, 2000)}

--- Editorial Suggestion ---
${suggestion}

${why ? `Reasoning: ${why}` : ''}
${principles && principles.length ? `Writing Principles: ${principles.join(', ')}` : ''}
---
Provide a rich, clear, and contextually relevant Mentor Insight for the user (the writer).
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
        max_tokens: 320,
        temperature: 0.65,
      })
    })
    const data = await response.json()
    const mentorInsight = data?.choices?.[0]?.message?.content?.trim()
    res.status(200).json({ deepDive: mentorInsight })
  } catch (e) {
    res.status(500).json({ error: 'Mentor insight failed.' })
  }
}
