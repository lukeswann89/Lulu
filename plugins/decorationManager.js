// /plugins/decorationManager.js
// Multi-layer decoration management for suggestions

import { Decoration, DecorationSet } from 'prosemirror-view';

export class DecorationManager {
  constructor() {
    this.layers = new Map();
    this.decorationCounter = 0;
  }

  // Create a decoration layer
  createLayer(name, priority = 0) {
    this.layers.set(name, {
      decorations: DecorationSet.empty,
      priority,
      visible: true,
      metadata: new Map()
    });
    console.log(`📝 Created decoration layer: ${name} (priority: ${priority})`);
    return name;
  }

  // Add decoration to a specific layer
  addDecoration(layerName, from, to, spec, metadata = {}) {
    const layer = this.layers.get(layerName);
    if (!layer) {
      console.warn(`Layer "${layerName}" not found`);
      return null;
    }

    const decorationId = ++this.decorationCounter;
    const decorationSpec = {
      ...spec,
      'data-decoration-id': decorationId,
      'data-layer': layerName
    };

    const decoration = Decoration.inline(from, to, decorationSpec);
    layer.decorations = layer.decorations.add(null, [decoration]);
    layer.metadata.set(decorationId, {
      from,
      to,
      spec: decorationSpec,
      metadata,
      created: Date.now()
    });

    console.log(`🎨 Added decoration ${decorationId} to layer ${layerName}`);
    return decorationId;
  }

  // Remove decoration by ID
  removeDecoration(decorationId) {
    for (const [layerName, layer] of this.layers) {
      const metadata = layer.metadata.get(decorationId);
      if (metadata) {
        // Find and remove the decoration
        const toRemove = layer.decorations.find().filter(dec => 
          dec.spec && dec.spec['data-decoration-id'] == decorationId
        );
        
        if (toRemove.length > 0) {
          layer.decorations = layer.decorations.remove(toRemove);
          layer.metadata.delete(decorationId);
          console.log(`🗑️ Removed decoration ${decorationId} from layer ${layerName}`);
          return true;
        }
      }
    }
    return false;
  }

  // Update decorations after document changes
  mapDecorations(tr) {
    for (const [layerName, layer] of this.layers) {
      layer.decorations = layer.decorations.map(tr.mapping, tr.doc);
      
      // Update metadata positions
      for (const [decorationId, metadata] of layer.metadata) {
        try {
          metadata.from = tr.mapping.map(metadata.from, 1);
          metadata.to = tr.mapping.map(metadata.to, -1);
        } catch (error) {
          // Decoration was deleted, remove it
          layer.metadata.delete(decorationId);
          console.log(`🗑️ Decoration ${decorationId} was deleted by transaction`);
        }
      }
    }
  }

  // Get combined decorations from all visible layers
  getCombinedDecorations(doc) {
    const sortedLayers = Array.from(this.layers.entries())
      .filter(([_, layer]) => layer.visible)
      .sort(([_, a], [__, b]) => a.priority - b.priority);

    let combined = DecorationSet.empty;
    
    for (const [layerName, layer] of sortedLayers) {
      const layerDecorations = layer.decorations.find();
      if (layerDecorations.length > 0) {
        combined = combined.add(doc, layerDecorations);
      }
    }

    return combined;
  }

  // Toggle layer visibility
  toggleLayer(layerName, visible = null) {
    const layer = this.layers.get(layerName);
    if (!layer) return false;

    layer.visible = visible !== null ? visible : !layer.visible;
    console.log(`👁️ Layer ${layerName} ${layer.visible ? 'shown' : 'hidden'}`);
    return layer.visible;
  }

  // Clear all decorations from a layer
  clearLayer(layerName) {
    const layer = this.layers.get(layerName);
    if (!layer) return false;

    const count = layer.metadata.size;
    layer.decorations = DecorationSet.empty;
    layer.metadata.clear();
    
    console.log(`🧹 Cleared ${count} decorations from layer ${layerName}`);
    return true;
  }

  // Get decorations at a specific position
  getDecorationsAt(pos, layerName = null) {
    const results = [];
    
    const layersToCheck = layerName 
      ? [this.layers.get(layerName)].filter(Boolean)
      : Array.from(this.layers.values()).filter(layer => layer.visible);

    for (const layer of layersToCheck) {
      const decorations = layer.decorations.find(pos, pos);
      results.push(...decorations.map(dec => ({
        decoration: dec,
        layer: dec.spec['data-layer'],
        id: dec.spec['data-decoration-id'],
        metadata: layer.metadata.get(dec.spec['data-decoration-id'])
      })));
    }

    return results;
  }

  // Find decorations by metadata
  findDecorations(predicate, layerName = null) {
    const results = [];
    
    const layersToCheck = layerName 
      ? [[layerName, this.layers.get(layerName)]].filter(([_, layer]) => layer)
      : Array.from(this.layers.entries());

    for (const [name, layer] of layersToCheck) {
      for (const [decorationId, metadata] of layer.metadata) {
        if (predicate(metadata, decorationId, name)) {
          const decorations = layer.decorations.find().filter(dec => 
            dec.spec['data-decoration-id'] == decorationId
          );
          
          results.push(...decorations.map(dec => ({
            decoration: dec,
            layer: name,
            id: decorationId,
            metadata
          })));
        }
      }
    }

    return results;
  }

  // Get layer statistics
  getLayerStats(layerName = null) {
    const layers = layerName 
      ? [[layerName, this.layers.get(layerName)]].filter(([_, layer]) => layer)
      : Array.from(this.layers.entries());

    return layers.map(([name, layer]) => ({
      name,
      priority: layer.priority,
      visible: layer.visible,
      decorationCount: layer.metadata.size,
      memoryUsage: this.estimateMemoryUsage(layer)
    }));
  }

  // Estimate memory usage of a layer
  estimateMemoryUsage(layer) {
    return layer.metadata.size * 200; // Rough estimate in bytes
  }

  // Cleanup old decorations
  cleanup(maxAge = 300000) { // 5 minutes
    const now = Date.now();
    let cleaned = 0;

    for (const [layerName, layer] of this.layers) {
      const toRemove = [];
      
      for (const [decorationId, metadata] of layer.metadata) {
        if (now - metadata.created > maxAge) {
          toRemove.push(decorationId);
        }
      }

      for (const decorationId of toRemove) {
        this.removeDecoration(decorationId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old decorations`);
    }
    
    return cleaned;
  }

  // Export layer configuration
  exportLayers() {
    const config = {};
    for (const [name, layer] of this.layers) {
      config[name] = {
        priority: layer.priority,
        visible: layer.visible,
        decorationCount: layer.metadata.size
      };
    }
    return config;
  }

  // Import layer configuration
  importLayers(config) {
    for (const [name, settings] of Object.entries(config)) {
      if (!this.layers.has(name)) {
        this.createLayer(name, settings.priority);
      }
      
      const layer = this.layers.get(name);
      layer.priority = settings.priority;
      layer.visible = settings.visible;
    }
  }
}

// Suggestion-specific decoration utilities
export class SuggestionDecorations {
  constructor(decorationManager) {
    this.manager = decorationManager;
    this.initializeLayers();
  }

  // Initialize standard suggestion layers
  initializeLayers() {
    this.manager.createLayer('grammar', 1);
    this.manager.createLayer('style', 2);
    this.manager.createLayer('structure', 3);
    this.manager.createLayer('suggestion', 4);
    this.manager.createLayer('developmental', 5);
  }

  // Add a suggestion decoration
  addSuggestion(from, to, original, replacement, type = 'suggestion', metadata = {}) {
    const spec = {
      class: `lulu-suggestion lulu-${type}`,
      'data-original': original,
      'data-replacement': replacement,
      'data-suggestion-type': type,
      title: `Click to replace with: "${replacement}"`
    };

    const suggestionMetadata = {
      original,
      replacement,
      type,
      ...metadata
    };

    return this.manager.addDecoration(type, from, to, spec, suggestionMetadata);
  }

  // Get suggestions by type
  getSuggestionsByType(type) {
    return this.manager.findDecorations(
      (metadata) => metadata.type === type,
      type
    );
  }

  // Get all suggestions
  getAllSuggestions() {
    return this.manager.findDecorations(
      (metadata) => metadata.original && metadata.replacement
    );
  }

  // Apply suggestion (remove decoration and return replacement)
  applySuggestion(suggestionId) {
    const decorations = this.manager.findDecorations(
      (_, id) => id == suggestionId
    );

    if (decorations.length > 0) {
      const suggestion = decorations[0];
      this.manager.removeDecoration(suggestionId);
      
      return {
        from: suggestion.metadata.from,
        to: suggestion.metadata.to,
        original: suggestion.metadata.original,
        replacement: suggestion.metadata.replacement
      };
    }

    return null;
  }

  // Update suggestion priorities
  updatePriorities(priorityMap) {
    for (const [type, priority] of Object.entries(priorityMap)) {
      const layer = this.manager.layers.get(type);
      if (layer) {
        layer.priority = priority;
      }
    }
  }
}

export default {
  DecorationManager,
  SuggestionDecorations
};