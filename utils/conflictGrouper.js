// /utils/conflictGrouper.js

export class ConflictGrouper {
    static groupOverlaps(suggestions) {
        if (suggestions.length < 2) {
            return suggestions;
        }

        const sorted = [...suggestions].sort((a, b) => a.from - b.from);
        const final_suggestions = [];
        let current_group = [sorted[0]];

        for (let i = 1; i < sorted.length; i++) {
            const last_in_group = current_group[current_group.length - 1];
            const current_suggestion = sorted[i];

            if (current_suggestion.from < last_in_group.to) {
                current_group.push(current_suggestion);
            } else {
                if (current_group.length > 1) {
                    final_suggestions.push(this.createConflictGroup(current_group));
                } else {
                    final_suggestions.push(current_group[0]);
                }
                current_group = [current_suggestion];
            }
        }

        if (current_group.length > 1) {
            final_suggestions.push(this.createConflictGroup(current_group));
        } else if (current_group.length > 0) {
            final_suggestions.push(current_group[0]);
        }

        return final_suggestions;
    }

    static createConflictGroup(conflictingSuggestions) {
        const from = Math.min(...conflictingSuggestions.map(s => s.from));
        const to = Math.max(...conflictingSuggestions.map(s => s.to));
        const groupId = `conflict_${from}_${to}_${Date.now()}`;

        return {
            id: groupId,
            isConflictGroup: true,
            suggestions: conflictingSuggestions,
            from,
            to,
            original: `Conflict over text from position ${from} to ${to}`,
            replacement: 'User choice required',
            editType: 'Conflict'
        };
    }
}