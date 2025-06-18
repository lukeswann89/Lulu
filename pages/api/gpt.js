import OpenAI from 'openai';
import { chunkText } from '../../utils/chunkText';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function stripCodeBlocks(str) {
  return str
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/g, '')
    .trim();
}

// ENHANCED: More precise text position finding
function findTextPositions(content, originalText, isHTML = false) {
  if (!content || !originalText) {
    return { positions: [], strategy: 'none', confidence: 0 };
  }

  const results = [];
  let strategy = 'direct';
  
  try {
    // ENHANCED Strategy 1: Exact match with case sensitivity and whitespace preservation
    let searchText = originalText.trim();
    let startIndex = 0;
    
    while (true) {
      const index = content.indexOf(searchText, startIndex);
      if (index === -1) break;
      
      results.push({
        start: index,
        end: index + searchText.length,
        match: content.substring(index, index + searchText.length),
        confidence: 1.0
      });
      
      startIndex = index + 1;
    }
    
    // ENHANCED Strategy 2: Case-insensitive exact match
    if (results.length === 0) {
      strategy = 'case_insensitive';
      const lowerContent = content.toLowerCase();
      const lowerSearch = searchText.toLowerCase();
      
      let startIndex = 0;
      while (true) {
        const index = lowerContent.indexOf(lowerSearch, startIndex);
        if (index === -1) break;
        
        results.push({
          start: index,
          end: index + searchText.length,
          match: content.substring(index, index + searchText.length),
          confidence: 0.95
        });
        
        startIndex = index + 1;
      }
    }
    
    // ENHANCED Strategy 3: Normalized whitespace matching
    if (results.length === 0) {
      strategy = 'normalized';
      const normalizeWhitespace = (text) => text.replace(/\s+/g, ' ').trim();
      
      const normalizedContent = normalizeWhitespace(content);
      const normalizedSearch = normalizeWhitespace(searchText);
      
      const index = normalizedContent.indexOf(normalizedSearch);
      if (index !== -1) {
        // Map back to original content position
        let originalIndex = 0;
        let normalizedIndex = 0;
        
        while (normalizedIndex < index && originalIndex < content.length) {
          if (/\s/.test(content[originalIndex])) {
            // Skip multiple whitespace in original
            while (originalIndex < content.length && /\s/.test(content[originalIndex])) {
              originalIndex++;
            }
            normalizedIndex++;
          } else {
            originalIndex++;
            normalizedIndex++;
          }
        }
        
        results.push({
          start: originalIndex,
          end: originalIndex + searchText.length,
          match: content.substring(originalIndex, originalIndex + searchText.length),
          confidence: 0.85
        });
      }
    }
    
    // ENHANCED Strategy 4: Word boundary matching (only for longer texts)
    if (results.length === 0 && searchText.length > 20) {
      strategy = 'word_boundary';
      const words = searchText.split(/\s+/).filter(w => w.length > 3);
      
      if (words.length >= 2) {
        const firstWord = words[0];
        const lastWord = words[words.length - 1];
        
        const firstIndex = content.indexOf(firstWord);
        const lastIndex = content.indexOf(lastWord, firstIndex);
        
        if (firstIndex !== -1 && lastIndex !== -1) {
          const endPos = lastIndex + lastWord.length;
          const matchedText = content.substring(firstIndex, endPos);
          
          // Only accept if the matched text contains at least 70% of the original words
          const matchedWords = matchedText.split(/\s+/).filter(w => w.length > 3);
          const wordOverlap = words.filter(w => matchedText.toLowerCase().includes(w.toLowerCase())).length;
          const overlapRatio = wordOverlap / words.length;
          
          if (overlapRatio >= 0.7) {
            results.push({
              start: firstIndex,
              end: endPos,
              match: matchedText,
              confidence: 0.6 * overlapRatio
            });
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Text position finding error:', error);
  }
  
  return {
    positions: results,
    strategy,
    confidence: results.length > 0 ? Math.max(...results.map(r => r.confidence)) : 0
  };
}

// ENHANCED: Stricter edit validation
function validateAndProcessEdits(edits, originalText, isHTML = false) {
  const processedEdits = [];
  const usedPositions = new Set();
  
  // ENHANCED: Pre-filter edits for quality
  const validEdits = edits.filter(edit => {
    if (!edit.original || !edit.suggestion) return false;
    if (edit.original.trim().length < 3) return false; // Too short to be reliable
    if (edit.original === edit.suggestion) return false; // No actual change
    return true;
  });
  
  console.log(`🔍 Filtered ${edits.length} edits down to ${validEdits.length} valid edits`);
  
  try {
    for (const edit of validEdits) {
      // Find positions for this edit
      const positionResults = findTextPositions(originalText, edit.original, isHTML);
      
      if (positionResults.positions.length > 0) {
        const position = positionResults.positions[0]; // Use best match
        const positionKey = `${position.start}-${position.end}`;
        
        // ENHANCED: Check for overlaps more carefully
        const hasOverlap = Array.from(usedPositions).some(usedKey => {
          const [usedStart, usedEnd] = usedKey.split('-').map(Number);
          return !(position.end <= usedStart || position.start >= usedEnd);
        });
        
        if (!hasOverlap && position.confidence >= 0.8) {
          processedEdits.push({
            ...edit,
            start: position.start,
            end: position.end,
            confidence: position.confidence,
            strategy: positionResults.strategy,
            matchedText: position.match,
            hasValidOffsets: true,
            isExactMatch: position.confidence === 1.0,
            needsReview: position.confidence < 0.95
          });
          
          usedPositions.add(positionKey);
          console.log(`✅ Matched "${edit.original.substring(0, 30)}..." with ${(position.confidence * 100).toFixed(1)}% confidence`);
        } else {
          console.warn(`⚠️ Skipping edit due to ${hasOverlap ? 'overlap' : 'low confidence'}: "${edit.original.substring(0, 30)}..."`);
        }
      } else {
        console.warn(`❌ Could not find position for: "${edit.original.substring(0, 30)}..."`);
      }
    }
    
    // Sort edits by position (end to start) to avoid offset shifts
    processedEdits.sort((a, b) => {
      if (a.start === null || b.start === null) return 0;
      return b.start - a.start;
    });
    
  } catch (error) {
    console.error('❌ Edit processing error:', error);
  }
  
  return processedEdits;
}

// ENHANCED: Better metadata with quality metrics
function generateEditMetadata(edits, originalText) {
  try {
    const totalEdits = edits.length;
    const validOffsets = edits.filter(e => e.hasValidOffsets).length;
    const exactMatches = edits.filter(e => e.isExactMatch).length;
    const highConfidence = edits.filter(e => e.confidence >= 0.95).length;
    const needsReview = edits.filter(e => e.needsReview).length;
    
    const strategies = {};
    const confidenceScores = [];
    
    edits.forEach(edit => {
      if (edit.strategy) {
        strategies[edit.strategy] = (strategies[edit.strategy] || 0) + 1;
      }
      if (edit.confidence) {
        confidenceScores.push(edit.confidence);
      }
    });
    
    const avgConfidence = confidenceScores.length > 0 
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length 
      : 0;
    
    return {
      totalEdits,
      validOffsets,
      exactMatches,
      highConfidence,
      needsReview,
      strategies,
      offsetAccuracy: totalEdits > 0 ? (validOffsets / totalEdits) * 100 : 0,
      averageConfidence: avgConfidence * 100,
      qualityScore: totalEdits > 0 ? (highConfidence / totalEdits) * 100 : 0,
      recommendedAction: needsReview > totalEdits / 2 ? 'review_needed' : 'ready'
    };
  } catch (error) {
    console.error('❌ Metadata generation error:', error);
    return {
      totalEdits: 0,
      validOffsets: 0,
      exactMatches: 0,
      highConfidence: 0,
      needsReview: 0,
      strategies: {},
      offsetAccuracy: 0,
      averageConfidence: 0,
      qualityScore: 0,
      recommendedAction: 'error'
    };
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
      text,
      editType,
      mode,
      thresholdOnly,
      editDepth,
      editProfile,
      writerCue,
      roadmapOnly,
      model
    } = req.body;

    if (!text || !editType || !mode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ENHANCED: Early validation
    if (text.trim().length < 10) {
      return res.status(400).json({ error: 'Text too short for meaningful editing' });
    }

    console.log('📝 API Request received:', { mode, textLength: text.length, editType });

    const editArray = Array.isArray(editType) ? editType : [editType];
    const typeList = editArray.join(', ');

    let prefix = `You are a world-class literary editor.`;
    if (editProfile === 'Creative') prefix += ` Use metaphorical or surreal creativity where appropriate.`;
    if (editProfile?.startsWith('Publisher')) prefix += ` Your goal is to match house style for ${editProfile.split(':')[1].trim()}.`;
    if (editProfile?.startsWith('Reader')) prefix += ` Ensure the tone suits a ${editProfile.split(':')[1].trim()} audience.`;

    let cuePrompt = writerCue
      ? `The author has provided their own editing notes:\n"""${writerCue}"""\nFor each note, 1) identify its intent as a separate actionable suggestion, 2) rewrite it for clarity, 3) briefly explain why your rewrite is stronger, and 4) assign 1–2 writing principles.`
      : '';
    let thresholdPrompt = thresholdOnly ? `Only suggest improvements if the text does not meet a professional literary standard.` : '';
    let roadmapTag = roadmapOnly || mode === 'General Edits' ? 'List proposed changes only. DO NOT revise the text.' : '';
    let depthNote = editDepth ? `Apply edits at a ${editDepth.toLowerCase()} level of intensity.` : '';

    const chunks = chunkText(text);
    const rawOutputs = [];
    const failedChunks = [];

    // Detect content type
    const isHTML = text.includes('<') && text.includes('>');
    console.log('📊 Processing:', { isHTML, textLength: text.length, chunks: chunks.length, mode });

    // Process chunks with OpenAI
    for (const [chunkIndex, chunk] of chunks.entries()) {
      let prompt = '';

      if (mode === 'Specific Edits') {
        prompt = `
You are Lulu, an esteemed senior editor at a prestigious literary publishing house. Generate specific, high-quality edits across developmental, structural, line, copy, and proofreading levels.

CRITICAL INSTRUCTIONS FOR TEXT MATCHING:
- The "original" text you provide MUST match the input text EXACTLY, character for character
- Include proper spacing, punctuation, and capitalization exactly as it appears
- Do NOT paraphrase or summarize the original text - use the exact wording
- Choose complete sentences or clear phrases that can be easily located
- Select text that is at least 10 characters long for reliable positioning
- Avoid overlapping selections

### Editing Types:
- **Developmental**: Character arcs, plot coherence, pacing, emotional resonance
- **Structural**: Chapter sequencing, scene transitions, narrative flow
- **Line**: Sentence structure, voice, tone, clarity, rhythm
- **Copy**: Grammar, syntax, punctuation, consistency
- **Proof**: Typos, spelling, formatting

For each edit, provide:
- Clear *Original* text alongside Suggested Revision
- Succinct *Justifications* grounded in literary standards
- Maintain the author's voice while enhancing

${writerCue ? "Author's notes: " + writerCue : ""}

Manuscript to edit:
${chunk}

Output as JSON array:
[
  {
    "editType": "Developmental" | "Structural" | "Line" | "Copy" | "Proof",
    "original": "EXACT text from manuscript (minimum 10 characters)",
    "suggestion": "Your improved version",
    "why": "Brief explanation"
  }
]

REMEMBER: "original" must match input exactly and be easily locatable. Only include high-value edits.
        `;
      } else {
        // General Edits
        prompt = `${prefix}
${cuePrompt}
${depthNote}
Editing types: ${typeList}
${thresholdPrompt}
${roadmapTag}
Provide output as JSON array.
Return ONLY valid JSON, no other commentary.
Text:
${chunk}`;
      }

      console.log(`📤 Processing chunk ${chunkIndex + 1}/${chunks.length}`);

      const completion = await openai.chat.completions.create({
        model: model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
      });

      let result = completion.choices[0].message.content.trim();
      if (result.startsWith('```')) result = stripCodeBlocks(result);
      result = result.replace(/^json\s*[\r\n]+/i, '').trim();
      rawOutputs.push(result);
    }

    // Parse results
    const parsed = [];
    for (const [i, raw] of rawOutputs.entries()) {
      try {
        const json = JSON.parse(raw);
        if (Array.isArray(json)) parsed.push(...json);
      } catch (e) {
        console.warn('❌ Failed to parse chunk:', raw.substring(0, 200) + '...');
        failedChunks.push(i + 1);
      }
    }

    console.log('📊 Raw edits parsed:', parsed.length);

    // Process edits based on mode
    if (mode === "Specific Edits") {
      console.log('🔍 Processing Specific Edits with enhanced validation...');
      
      const processedEdits = validateAndProcessEdits(parsed, text, isHTML);
      const metadata = generateEditMetadata(processedEdits, text);
      
      console.log('📈 Processing complete:', {
        totalEdits: metadata.totalEdits,
        validOffsets: metadata.validOffsets,
        offsetAccuracy: metadata.offsetAccuracy.toFixed(1) + '%',
        averageConfidence: metadata.averageConfidence.toFixed(1) + '%',
        qualityScore: metadata.qualityScore.toFixed(1) + '%'
      });

      return res.status(200).json({
        suggestions: processedEdits,
        metadata,
        failedChunks,
        processingInfo: {
          isHTML,
          totalChunks: chunks.length,
          textLength: text.length,
          offsetAccuracy: metadata.offsetAccuracy,
          averageConfidence: metadata.averageConfidence,
          qualityScore: metadata.qualityScore
        }
      });
    } else {
      // General Edits
      return res.status(200).json({
        roadmap: parsed,
        failedChunks
      });
    }

  } catch (error) {
    console.error('❌ API Handler Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}