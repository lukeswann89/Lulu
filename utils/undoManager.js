class UndoManager {
  constructor() {
    this.history = [];
  }

  // Save a deep clone of the current state
  save({ text, suggestions, sugId, actionType }) {
    this.history.push({
      text,
      suggestions: JSON.parse(JSON.stringify(suggestions)), // deep clone suggestions
      sugId,
      actionType,
      time: Date.now()
    });
  }

  // Undo the last action for the given sugId
  undo(sugId) {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].sugId === sugId) {
        const snapshot = this.history[i];
        this.history = this.history.slice(0, i);
        return snapshot;
      }
    }
    return null;
  }

  // Optional: Clear history
  clear() {
    this.history = [];
  }

  // Optional: Get history length
  get length() {
    return this.history.length;
  }
}

export default UndoManager;