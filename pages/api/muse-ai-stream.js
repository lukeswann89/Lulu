import OpenAI from 'openai';
import { mergeCanvasUpdates, cleanEmptyCanvasSections } from '../../utils/canvasUtils';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userProfile, currentCanvas, chatHistory, newMessage, isPinRequest } = req.body;

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Generate streaming response
    await generateStreamingMuseResponse({
      userProfile,
      currentCanvas,
      chatHistory,
      newMessage,
      isPinRequest,
      res
    });

  } catch (error) {
    console.error('Streaming Muse AI error:', error);
    // Send error event
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: 'Failed to generate response'
    })}\n\n`);
    res.end();
  }
}

async function generateStreamingMuseResponse({ userProfile, currentCanvas, chatHistory, newMessage, isPinRequest, res }) {
  try {
    // Build conversation context
    const conversationContext = chatHistory
      .slice(-6) // Keep last 6 messages for context
      .map(msg => `${msg.sender === 'user' ? userProfile.name : 'Lulu'}: ${msg.message}`)
      .join('\n');

    // Generate personality-adapted system prompt
    const systemPrompt = buildSystemPrompt(userProfile);

    // Check for targeting phrases
    const targetingInfo = detectTargeting(newMessage);

    // Create main conversation prompt
    const conversationPrompt = `
CURRENT CANVAS STATE:
${JSON.stringify(currentCanvas, null, 2)}

RECENT CONVERSATION:
${conversationContext}

NEW MESSAGE FROM ${userProfile.name.toUpperCase()}: ${newMessage}

${isPinRequest ? 'USER ACTION: The user clicked the pin button to add an AI response to the canvas. Determine the best canvas location for this content.' : ''}

${targetingInfo.hasTarget ? `TARGETING REQUEST DETECTED: User wants to add content to "${targetingInfo.target}"` : ''}

Please provide a conversational response:
${isPinRequest 
  ? 'Briefly acknowledge that you\'ve pinned the content to the appropriate canvas section.'
  : 'Respond naturally as Lulu, their writing muse, in a way that matches their personality. Ask follow-up questions that help develop their story. Be encouraging and insightful.'
}

IMPORTANT: 
- Respond ONLY with the conversational message
- Keep responses natural and engaging (2-4 sentences typically)
- Don't include any JSON or formatting - just the message text
- Use British English spelling and phrasing
`;

    // Send start event
    res.write(`data: ${JSON.stringify({
      type: 'start',
      message: 'Starting response...'
    })}\n\n`);

    // Create streaming completion
    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: conversationPrompt }
      ],
      temperature: 0.7,
      max_tokens: 300,
      stream: true
    });

    let fullResponse = '';
    let wordBuffer = '';
    
    // Stream tokens as they arrive
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      
      if (content) {
        fullResponse += content;
        wordBuffer += content;
        
        // Send complete words, not individual characters
        const words = wordBuffer.split(' ');
        
        if (words.length > 1) {
          // Send all but the last word (which might be incomplete)
          const completeWords = words.slice(0, -1).join(' ') + ' ';
          
          res.write(`data: ${JSON.stringify({
            type: 'token',
            content: completeWords
          })}\n\n`);
          
          // Keep the last potentially incomplete word
          wordBuffer = words[words.length - 1];
        }
      }
      
      // Check if the response has finished
      if (chunk.choices[0]?.finish_reason) {
        // Send any remaining content
        if (wordBuffer.trim()) {
          res.write(`data: ${JSON.stringify({
            type: 'token',
            content: wordBuffer
          })}\n\n`);
        }
        break;
      }
    }

    // Now generate canvas updates separately (non-streaming)
    const canvasUpdates = await generateCanvasUpdates({
      userProfile,
      currentCanvas,
      fullResponse,
      newMessage,
      targetingInfo,
      isPinRequest
    });

    // Send canvas updates
    res.write(`data: ${JSON.stringify({
      type: 'canvas_updates',
      canvasUpdates,
      targetSection: targetingInfo.hasTarget ? targetingInfo.target : null
    })}\n\n`);

    // Send completion event
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      fullMessage: fullResponse.trim()
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('Streaming generation error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: 'Failed to generate streaming response'
    })}\n\n`);
    res.end();
  }
}

async function generateCanvasUpdates({ userProfile, currentCanvas, fullResponse, newMessage, targetingInfo, isPinRequest }) {
  try {
    const canvasPrompt = `
CURRENT CANVAS STATE:
${JSON.stringify(currentCanvas, null, 2)}

USER MESSAGE: ${newMessage}
AI RESPONSE: ${fullResponse}

${isPinRequest ? 'PINNING REQUEST: Extract story information from the AI response above.' : ''}
${targetingInfo.hasTarget ? `TARGETING REQUEST: Place content in "${targetingInfo.target}" section.` : ''}

Extract any new story information from this conversation and format it as JSON updates for the canvas. 
Only include sections that have new or updated information based on the conversation.

Return ONLY a valid JSON object with this exact structure (omit empty sections):

{
  "character": {
    "protagonist": "any new protagonist info",
    "antagonist": "any new antagonist info", 
    "supporting": "any new supporting character info"
  },
  "plot": {
    "actI": "any setup/beginning info",
    "actII": "any conflict/middle info",
    "actIII": "any resolution/ending info"
  },
  "world": {
    "setting": "any location/time info",
    "history": "any backstory/worldbuilding info",
    "rules": "any world rules/magic systems/constraints"
  },
  "themes": {
    "central": "any main themes/messages",
    "symbolism": "any symbols/metaphors mentioned",
    "message": "any deeper meaning/purpose"
  },
  "voice": {
    "tone": "any mood/atmosphere descriptions",
    "style": "any writing style preferences",
    "pov": "any point-of-view decisions"
  }
}

IMPORTANT: Return ONLY the JSON object, no explanations or other text.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: canvasPrompt }],
      temperature: 0.3,
      max_tokens: 500
    });

    const response = completion.choices[0].message.content.trim();
    
    try {
      const parsed = JSON.parse(response);
      return cleanEmptyCanvasSections(parsed);
    } catch (parseError) {
      console.warn('Failed to parse canvas updates:', parseError);
      return {};
    }

  } catch (error) {
    console.error('Canvas updates generation error:', error);
    return {};
  }
}

// Utility functions from original muse-ai.js
function detectTargeting(message) {
  const lowerMessage = message.toLowerCase();
  
  // Check if message contains "Lulu" and targeting phrases
  if (!lowerMessage.includes('lulu')) {
    return { hasTarget: false, target: null };
  }
  
  // Common targeting patterns
  const targetingPatterns = [
    { pattern: /add (?:this )?to (?:the )?(\w+)/, type: 'section' },
    { pattern: /put (?:this )?in (?:the )?(\w+)/, type: 'section' },
    { pattern: /this goes in (?:the )?(\w+)/, type: 'section' },
    { pattern: /save (?:this )?to (?:the )?(\w+)/, type: 'section' },
    { pattern: /file (?:this )?under (\w+)/, type: 'section' },
    { pattern: /(\w+) (?:section|card)/, type: 'explicit' }
  ];
  
  // Section name mappings
  const sectionMappings = {
    // Character sections
    'protagonist': 'character.protagonist',
    'main character': 'character.protagonist',
    'hero': 'character.protagonist',
    'antagonist': 'character.antagonist',
    'villain': 'character.antagonist',
    'supporting': 'character.supporting',
    'side characters': 'character.supporting',
    'character': 'character',
    'characters': 'character',
    
    // Plot sections
    'plot': 'plot',
    'story': 'plot',
    'beginning': 'plot.actI',
    'setup': 'plot.actI',
    'act 1': 'plot.actI',
    'act i': 'plot.actI',
    'middle': 'plot.actII',
    'conflict': 'plot.actII',
    'act 2': 'plot.actII',
    'act ii': 'plot.actII',
    'ending': 'plot.actIII',
    'resolution': 'plot.actIII',
    'act 3': 'plot.actIII',
    'act iii': 'plot.actIII',
    
    // World sections
    'world': 'world',
    'worldbuilding': 'world',
    'setting': 'world.setting',
    'location': 'world.setting',
    'place': 'world.setting',
    'history': 'world.history',
    'backstory': 'world.history',
    'rules': 'world.rules',
    'magic': 'world.rules',
    'system': 'world.rules',
    
    // Theme sections
    'theme': 'themes',
    'themes': 'themes',
    'meaning': 'themes.central',
    'central theme': 'themes.central',
    'symbolism': 'themes.symbolism',
    'symbols': 'themes.symbolism',
    'message': 'themes.message',
    'moral': 'themes.message',
    
    // Voice sections
    'voice': 'voice',
    'style': 'voice.style',
    'writing style': 'voice.style',
    'tone': 'voice.tone',
    'mood': 'voice.tone',
    'atmosphere': 'voice.tone',
    'pov': 'voice.pov',
    'point of view': 'voice.pov',
    'perspective': 'voice.pov'
  };
  
  // Check each pattern
  for (const { pattern } of targetingPatterns) {
    const match = lowerMessage.match(pattern);
    if (match) {
      const targetText = match[1].toLowerCase();
      
      // Look for exact mapping
      for (const [key, value] of Object.entries(sectionMappings)) {
        if (targetText.includes(key) || key.includes(targetText)) {
          return { hasTarget: true, target: value };
        }
      }
    }
  }
  
  return { hasTarget: false, target: null };
}

function buildSystemPrompt(userProfile) {
  const { name, bigFive, writerType, processStyle, storyDrive, insights } = userProfile;
  
  let personality = `You are Lulu, an AI writing muse helping ${name} develop their story. `;
  
  // Adapt personality based on user profile
  if (insights.conversationStyle === 'energetic') {
    personality += `Be enthusiastic, encouraging, and excited about their ideas. Use exclamation points and positive language. `;
  } else {
    personality += `Be thoughtful, reflective, and gently encouraging. Ask deeper questions and give them space to think. `;
  }
  
  if (insights.primaryMode === 'explorer') {
    personality += `${name} loves to discover their story organically. Encourage wild ideas, unexpected connections, and creative exploration. Don't push for too much structure at once. `;
  } else if (insights.primaryMode === 'architect') {
    personality += `${name} likes systematic planning. Help them build their story methodically, ask clarifying questions, and suggest logical next steps. `;
  }
  
  if (storyDrive === 'character') {
    personality += `Focus conversations on character development, relationships, and emotional arcs. `;
  } else if (storyDrive === 'plot') {
    personality += `Focus on story events, conflicts, and narrative structure. `;
  } else if (storyDrive === 'world') {
    personality += `Focus on worldbuilding, settings, and environmental details. `;
  } else if (storyDrive === 'theme') {
    personality += `Focus on deeper meanings, messages, and thematic elements. `;
  }
  
  personality += `

CONVERSATION GUIDELINES:
- Be encouraging and supportive
- Ask follow-up questions that help develop their ideas
- Make connections between different story elements
- Suggest creative possibilities without being prescriptive
- Keep responses conversational and natural (2-4 sentences typically)
- Reference their personality style naturally in your responses
- Help them discover their story rather than telling them what it should be
- Use British English spelling and phrasing (colour, realise, whilst, etc.)
- When they use "Lulu, add to..." acknowledge their targeting request`;

  return personality;
}
