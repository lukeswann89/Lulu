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

    // Generate AI response and canvas updates
    const { aiResponse, canvasUpdates, targetSection } = await generateMuseResponse({
      userProfile,
      currentCanvas,
      chatHistory,
      newMessage,
      isPinRequest
    });

    res.status(200).json({
      success: true,
      aiResponse,
      canvasUpdates,
      targetSection
    });

  } catch (error) {
    console.error('Muse AI error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate response'
    });
  }
}

async function generateMuseResponse({ userProfile, currentCanvas, chatHistory, newMessage, isPinRequest }) {
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

Please provide two responses:

1. CONVERSATIONAL RESPONSE: 
${isPinRequest 
  ? 'Briefly acknowledge that you\'ve pinned the content to the appropriate canvas section.'
  : 'Respond naturally as Lulu, their writing muse, in a way that matches their personality. Ask follow-up questions that help develop their story. Be encouraging and insightful.'
}

2. CANVAS UPDATES:
Extract any new story information from this conversation and format it as JSON updates for the canvas. 
${targetingInfo.hasTarget ? `IMPORTANT: Place the content in the "${targetingInfo.target}" section as requested.` : ''}
Only include sections that should be updated based on the conversation. Use this exact format:

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

3. TARGET SECTION (optional):
If the user specified where to place content or if you're pinning content, specify the target section in format: "category.section" (e.g., "character.protagonist")

IMPORTANT: 
- Only include sections that have new or updated information
- If nothing new was mentioned for a section, omit it entirely from the JSON
- When pinning content, extract the key story information from the AI message being pinned
- For targeting requests, ensure content goes to the requested section

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
CONVERSATION: [Your conversational response here]

CANVAS_UPDATES: [JSON object here]

TARGET_SECTION: [category.section or null]
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: conversationPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const response = completion.choices[0].message.content;
    
    // Parse the response
    const conversationMatch = response.match(/CONVERSATION:\s*([\s\S]*?)(?=CANVAS_UPDATES:|$)/);
    const canvasMatch = response.match(/CANVAS_UPDATES:\s*([\s\S]*?)(?=TARGET_SECTION:|$)/);
    const targetMatch = response.match(/TARGET_SECTION:\s*(.+)/);
    
    let aiResponse = conversationMatch ? conversationMatch[1].trim() : 
      "That's fascinating! Tell me more about that aspect of your story.";
    
    let canvasUpdates = {};
    if (canvasMatch) {
      try {
        const jsonStr = canvasMatch[1].trim();
        canvasUpdates = JSON.parse(jsonStr);
        
        // Clean up empty sections using utility function
        canvasUpdates = cleanEmptyCanvasSections(canvasUpdates);
      } catch (parseError) {
        console.warn('Failed to parse canvas updates:', parseError);
        canvasUpdates = {};
      }
    }

    let targetSection = null;
    if (targetMatch) {
      targetSection = targetMatch[1].trim();
      if (targetSection === 'null' || targetSection === 'none') {
        targetSection = null;
      }
    }

    return { aiResponse, canvasUpdates, targetSection };

  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate AI response');
  }
}

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
  // Handle missing or incomplete userProfile
  if (!userProfile) {
    return `You are Lulu, an AI writing muse helping a writer develop their story. Be encouraging, supportive, and ask follow-up questions that help develop their ideas. Keep responses conversational and natural.`;
  }

  const { name = 'Writer', bigFive, writerType, processStyle, storyDrive, insights = {} } = userProfile;
  
  let personality = `You are Lulu, an AI writing muse helping ${name} develop their story. `;
  
  // Adapt personality based on user profile (with safe property access)
  if (insights && insights.conversationStyle === 'energetic') {
    personality += `Be enthusiastic, encouraging, and excited about their ideas. Use exclamation points and positive language. `;
  } else {
    personality += `Be thoughtful, reflective, and gently encouraging. Ask deeper questions and give them space to think. `;
  }
  
  if (insights && insights.primaryMode === 'explorer') {
    personality += `${name} loves to discover their story organically. Encourage wild ideas, unexpected connections, and creative exploration. Don't push for too much structure at once. `;
  } else if (insights && insights.primaryMode === 'architect') {
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
- When they use "Lulu, add to..." acknowledge their targeting request

CANVAS EXTRACTION GUIDELINES:
- Extract story information naturally mentioned in conversation
- Don't force information that wasn't clearly stated
- Combine and build on previous canvas content when adding new info
- Be specific and detailed in canvas updates
- Preserve the user's exact language and ideas when possible
- When targeting is requested, place content in the specified section
- When pinning AI content, extract the key story elements from that content`;

  return personality;
}