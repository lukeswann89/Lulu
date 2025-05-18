export default function WriterCue({ cue, setCue }) {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">📝 Your Notes for Lulu (Writer Cue)</label>
        <textarea
          value={cue}
          onChange={(e) => setCue(e.target.value)}
          className="w-full p-2 border rounded text-sm"
          rows={3}
          placeholder="e.g. I want this section to feel tense, poetic, or otherworldly..."
        />
      </div>
    );
  }
  