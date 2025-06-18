// Utility function to merge canvas updates with existing data
export function mergeCanvasUpdates(existingCanvas, updates) {
  const merged = { ...existingCanvas };
  
  Object.keys(updates).forEach(category => {
    if (!merged[category]) merged[category] = {};
    
    Object.keys(updates[category]).forEach(section => {
      const newContent = updates[category][section];
      const existingContent = merged[category][section];
      
      if (existingContent && existingContent.trim()) {
        // Merge with existing content if it's different
        if (!existingContent.includes(newContent)) {
          merged[category][section] = `${existingContent}\n\n${newContent}`;
        }
      } else {
        // Replace empty/missing content
        merged[category][section] = newContent;
      }
    });
  });
  
  return merged;
}

// Helper function to clean up empty canvas sections
export function cleanEmptyCanvasSections(canvasUpdates) {
  const cleaned = { ...canvasUpdates };
  
  Object.keys(cleaned).forEach(category => {
    if (typeof cleaned[category] === 'object') {
      Object.keys(cleaned[category]).forEach(section => {
        if (!cleaned[category][section] || cleaned[category][section].trim() === '') {
          delete cleaned[category][section];
        }
      });
      
      // Remove empty categories
      if (Object.keys(cleaned[category]).length === 0) {
        delete cleaned[category];
      }
    }
  });
  
  return cleaned;
}