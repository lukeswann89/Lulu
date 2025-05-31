// utils/suggestionUtils.js

export function findAllPositions(text, searchStr) {
  const positions = [];
  let lastIndex = 0;
  while (true) {
    const index = text.indexOf(searchStr, lastIndex);
    if (index === -1) break;
    positions.push({
      from: index,
      to: index + searchStr.length
    });
    lastIndex = index + 1; // Allow overlapping matches
  }
  return positions;
}

export function realignSuggestions(text, suggestions) {
  const positionMap = new Map();
  suggestions.forEach(sug => {
    if (sug.state === 'pending') {
      positionMap.set(sug.id, findAllPositions(text, sug.original));
    }
  });
  return suggestions.map(sug => {
    if (sug.state !== 'pending') return sug;
    const positions = positionMap.get(sug.id) || [];
    if (positions.length === 0) {
      return {
        ...sug,
        alignError: true,
        errorMessage: `Original text "${sug.original}" not found in current document`
      };
    }
    let bestPosition = positions[0];
    let minDistance = Infinity;
    if (typeof sug.from === 'number') {
      positions.forEach(pos => {
        const distance = Math.abs(pos.from - sug.from);
        if (distance < minDistance) {
          minDistance = distance;
          bestPosition = pos;
        }
      });
    }
    return {
      ...sug,
      from: bestPosition.from,
      to: bestPosition.to,
      alignError: false,
      errorMessage: null
    };
  });
}
