// /components/TipTapEditor.jsx - MODIFY YOUR EXISTING FILE
// Add these imports and modifications to your current TipTap setup

import React, { useCallback, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useLuluHighlights } from '../hooks/useLuluHighlights';

const TipTapEditor = ({ content, onChange, onAISuggestions }) => {
  const [editorContent, setEditorContent] = useState(content || '');
  const [isProcessing, setIsProcessing] = useState(false);

  // Your existing TipTap configuration
  const editor = useEditor({
    extensions: [
      StarterKit,
      // ... your other extensions
    ],
    content: editorContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      setEditorContent(html);
      onChange?.(html, text);
    },
  });

  // NEW: Initialize highlight system
  const highlights = useLuluHighlights(editor, {
    onReplace: useCallback((data) => {
      console.log('✅ Suggestion applied:', data);
      // Track user actions, analytics, etc.
    }, []),
    onHighlightAdded: useCallback((data) => {
      console.log('🎨 Highlights added:', data);
    }, []),
    onClear: useCallback(() => {
      console.log('🧹 All highlights cleared');
    }, [])
  });

  // NEW: AI Suggestion Integration
  const handleGetAISuggestions = useCallback(async () => {
    if (!editor || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const text = editor.getText();
      const aiHighlights = await highlights.addAISuggestions(text, [
        'grammar', 'style', 'structure', 'suggestion'
      ]);
      
      console.log(`✅ Added ${aiHighlights.length} AI suggestions`);
      onAISuggestions?.(aiHighlights);
    } catch (error) {
      console.error('❌ AI suggestions failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [editor, highlights, isProcessing, onAISuggestions]);

  // NEW: Quick demo for testing
  const handleDemo = useCallback(() => {
    const demoHighlights = highlights.loadDemoSuggestions();
    console.log(`🎯 Demo loaded: ${demoHighlights.length} suggestions`);
  }, [highlights]);

  // Stats for UI
  const [stats, setStats] = useState({ total: 0, byType: {} });
  
  useEffect(() => {
    const updateStats = () => {
      if (highlights.isReady) {
        setStats(highlights.getStats());
      }
    };
    
    // Update stats every second (or trigger on highlight changes)
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, [highlights]);

  return (
    <div className="lulu-editor-container">
      {/* Existing editor */}
      <EditorContent editor={editor} />
      
      {/* NEW: Highlight Controls */}
      <div className="lulu-highlight-controls" style={{ 
        marginTop: '1rem', 
        padding: '1rem', 
        background: '#f8fafc', 
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleGetAISuggestions}
            disabled={!highlights.isReady || isProcessing}
            style={{
              background: isProcessing ? '#6b7280' : '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            {isProcessing ? '🤖 Processing...' : '🚀 Get AI Suggestions'}
          </button>
          
          <button
            onClick={handleDemo}
            disabled={!highlights.isReady}
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            🎯 Demo Highlights
          </button>
          
          <button
            onClick={highlights.clearAllHighlights}
            disabled={!highlights.isReady}
            style={{
              background: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            🧹 Clear All
          </button>
          
          {/* Stats Display */}
          <div style={{ 
            marginLeft: 'auto', 
            fontSize: '14px', 
            color: '#6b7280',
            fontWeight: '500'
          }}>
            📊 {stats.total} suggestions
            {stats.total > 0 && (
              <span style={{ marginLeft: '8px' }}>
                {Object.entries(stats.byType).map(([type, count]) => (
                  <span key={type} style={{ marginLeft: '8px' }}>
                    {type}: {count}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>
        
        {/* Status indicator */}
        <div style={{ marginTop: '8px', fontSize: '12px' }}>
          Status: {highlights.isReady ? '✅ Ready' : '⏳ Initializing...'}
        </div>
      </div>
    </div>
  );
};

export default TipTapEditor;