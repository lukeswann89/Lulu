import React, { useMemo, useState } from 'react';

function splitIntoSentences(text) {
  if (!text) return [];
  const raw = text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
  return raw;
}

function tokenizeWords(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-’'–—]+/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function computeStdDev(numbers) {
  if (!numbers || numbers.length === 0) return 0;
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
  return Math.sqrt(variance);
}

function pickGreenFlagSentence(finalText) {
  const sentences = splitIntoSentences(finalText);
  const candidates = sentences.filter(s => {
    const w = tokenizeWords(s).length;
    return w >= 10 && w <= 15;
  });
  if (candidates.length === 0) {
    return sentences[0] || '';
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function computeCrutch(finalText) {
  const filterVerbs = ['felt','feel','feels','saw','see','seen','realized','seemed','seem','noticed','decided','knew','know','thought','think'];
  const words = tokenizeWords(finalText);
  const counts = new Map();
  for (const w of words) {
    if (filterVerbs.includes(w)) counts.set(w, (counts.get(w) || 0) + 1);
  }
  let best = null, bestCount = 0;
  counts.forEach((count, word) => {
    if (count > bestCount) { best = word; bestCount = count; }
  });
  return best ? { term: best, count: bestCount } : null;
}

function computeSignaturePunctuation(finalText) {
  const candidates = {
    '—': (finalText.match(/—/g) || []).length, // em-dash
    '-': (finalText.match(/-/g) || []).length, // hyphen
    ',': (finalText.match(/,/g) || []).length,
    ';': (finalText.match(/;/g) || []).length,
    ':': (finalText.match(/:/g) || []).length,
    '…': (finalText.match(/…/g) || []).length,
    '...': (finalText.match(/\.\.\./g) || []).length,
  };
  let best = null, bestCount = 0;
  Object.entries(candidates).forEach(([p, c]) => {
    if (c > bestCount) { best = p; bestCount = c; }
  });
  return best ? { mark: best, count: bestCount } : null;
}

export default function EditorialReport({
  suggestionsReviewed = [],
  initialText = '',
  finalText = '',
  onApplyWithLulu = () => {},
}) {
  const [activeTab, setActiveTab] = useState('mot'); // 'mot' | 'constellation'

  const stats = useMemo(() => {
    const accepted = suggestionsReviewed.filter(d => d.action === 'accept');
    // Top Win: placeholder based on accepted count
    const topWin = accepted.length > 0
      ? `You strengthened ${accepted.length} sentence${accepted.length === 1 ? '' : 's'} with focused edits.`
      : 'Your draft stayed stable — confidence is warranted.';

    const greenFlag = pickGreenFlagSentence(finalText);

    // Craft Constellation
    const sentences = splitIntoSentences(finalText);
    const sentenceLengths = sentences.map(s => tokenizeWords(s).length).filter(n => n > 0);
    const lengthVariety = Number(computeStdDev(sentenceLengths).toFixed(2));

    const words = tokenizeWords(finalText);
    const uniqueWordCount = new Set(words).size;
    const lexicalDiversity = words.length === 0 ? 0 : Number((uniqueWordCount / words.length).toFixed(3));

    const crutch = computeCrutch(finalText);
    const signature = computeSignaturePunctuation(finalText);

    // Session Focus Summary: infer from most common suggestion type
    const focusType = (() => {
      const typeCounts = new Map();
      for (const d of suggestionsReviewed) {
        const t = (d?.suggestion?.editType || d?.suggestion?.type || 'style').toLowerCase();
        typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
      }
      let best = null, bestCount = 0;
      typeCounts.forEach((c, t) => { if (c > bestCount) { best = t; bestCount = c; } });
      return best;
    })();

    const focusSummary = (() => {
      const map = {
        passive: 'This was a productive polish focused on strengthening active voice.',
        grammar: 'This session centered on clarity and correctness at the line level.',
        line: 'This session refined line-level precision and rhythm.',
        copy: 'This session emphasized polish and cadence to improve flow.',
        proof: 'This session focused on final consistency and light touch-ups.',
        substantive: 'This session tuned structure and thematic focus.',
        style: 'This session honed stylistic consistency and tone.'
      };
      return map[focusType] || 'This was a productive polish focused on clarity and coherence.';
    })();

    // Dialectic labels and guidance
    const sentenceVarietyLabel = (() => {
      const sd = lengthVariety;
      if (sd < 2) return 'Very Punchy';
      if (sd < 4) return 'Punchy & Direct';
      if (sd < 6) return 'Balanced';
      if (sd < 8) return 'Flowing & Lyrical';
      return 'Very Lyrical';
    })();

    const sentenceVarietyHowTo = (() => {
      const map = {
        'Very Punchy': 'Great for rapid-fire dialogue, micro-essays, and high-tension beats. Consider occasional longer lines to create contrast and relief.',
        'Punchy & Direct': 'Powerful for action scenes, thrillers, and clear, declarative prose. Layer in a few longer sentences to add texture and breath.',
        'Balanced': 'Versatile across genres. You can lean shorter for pace or longer for atmosphere depending on the moment.',
        'Flowing & Lyrical': 'Ideal for reflective passages and immersive description. Blend in punchier lines to sharpen key turns.',
        'Very Lyrical': 'Lush and meditative. Use strategically for mood pieces or slow-burn chapters; add concise beats to maintain momentum.'
      };
      return map[sentenceVarietyLabel];
    })();

    const lexicalLabel = (() => {
      const r = lexicalDiversity;
      if (r < 0.45) return 'Clear & Accessible';
      if (r < 0.6) return 'Balanced';
      return 'Rich & Evocative';
    })();

    const lexicalHowTo = (() => {
      const map = {
        'Clear & Accessible': 'Excellent for instructional writing, fast-paced fiction, and clean business prose. Introduce occasional vivid terms to elevate key images.',
        'Balanced': 'A natural middle path. You can tilt simpler for speed or richer for atmosphere depending on scene goals.',
        'Rich & Evocative': 'Great for literary tone, sensory writing, and character voice. Use sparingly in expository sections to avoid density.'
      };
      return map[lexicalLabel];
    })();

    return { topWin, greenFlag, lengthVariety, lexicalDiversity, crutch, signature, focusSummary, sentenceVarietyLabel, sentenceVarietyHowTo, lexicalLabel, lexicalHowTo };
  }, [suggestionsReviewed, finalText]);

  return (
    <div className="bg-white border rounded-lg shadow p-6">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🏁</div>
        <h2 className="text-2xl font-bold text-purple-700">Studio Complete! Your manuscript is polished.</h2>
        <p className="text-sm text-gray-600 mt-1">A mentor’s reflection to carry forward.</p>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-2 rounded ${activeTab === 'mot' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('mot')}
        >
          Manuscript MOT
        </button>
        <button
          className={`px-3 py-2 rounded ${activeTab === 'constellation' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('constellation')}
        >
          Craft Constellation
        </button>
      </div>

      {activeTab === 'mot' ? (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 border border-purple-200 rounded">
            <div className="text-sm text-purple-700 font-semibold">Session Focus Summary</div>
            <p className="text-purple-900">{stats.focusSummary}</p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <div className="text-sm text-blue-700 font-semibold">Top Win</div>
            <div className="text-blue-900">{stats.topWin}</div>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded">
            <div className="text-sm text-emerald-700 font-semibold">Green Flag Showcase</div>
            <blockquote className="text-emerald-900 italic">“{stats.greenFlag}”</blockquote>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded">
            <div className="text-sm text-indigo-700 font-semibold mb-1">Sentence Length Variety</div>
            <div className="text-indigo-900 text-lg mb-1">{stats.sentenceVarietyLabel}</div>
            <div className="text-indigo-800 text-sm">How to Use This Style: {stats.sentenceVarietyHowTo}</div>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded">
            <div className="text-sm text-gray-700 font-semibold mb-2">Habit Spotlights</div>
            <ul className="list-disc pl-5 text-gray-900 space-y-1">
              <li>
                Crutch: {stats.crutch ? `${stats.crutch.term} (${stats.crutch.count}×)` : 'None prominent'}
              </li>
              <li>
                Signature Move: {stats.signature ? `${stats.signature.mark} (${stats.signature.count}×)` : 'TBD'}
              </li>
            </ul>
          </div>

          <div className="p-4 bg-sky-50 border border-sky-200 rounded">
            <div className="text-sm text-sky-700 font-semibold mb-1">Lexical Diversity</div>
            <div className="text-sky-900 text-lg mb-1">{stats.lexicalLabel}</div>
            <div className="text-sky-800 text-sm">How to Use This Style: {stats.lexicalHowTo}</div>
          </div>
        </div>
      )}
    </div>
  );
}


