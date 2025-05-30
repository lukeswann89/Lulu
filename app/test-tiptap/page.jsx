'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

// Test content with multiple instances to track
const initialContent = 'This is a test sentence that we will highlight. We can test multiple occurrences of test in this text.';

// Track all positions of a term in text
function findAllPositions(text, searchTerm) {
  const positions = [];
  let lastIndex = 0;
  
  while (true) {
    const index = text.indexOf(searchTerm, lastIndex);
    if (index === -1) break;
    positions.push({
      from: index,
      to: index + searchTerm.length
    });
    lastIndex = index + 1;
  }
  
  return positions;
}

// Create plugin key outside component to avoid recreation
const highlightPluginKey = new PluginKey('positionTrackingHighlight');

// Basic highlight extension with position tracking
const PositionTrackingHighlight = Extension.create({
  name: 'positionTrackingHighlight',

  addProseMirrorPlugins() {
    const plugin = new Plugin({
      key: highlightPluginKey,
      state: {
        init: () => ({ positions: [] }),
        apply: (tr, value) => {
          const positions = findAllPositions(tr.doc.textContent, 'test');
          return { positions };
        }
      },
      props: {
        decorations: (state) => {
          const decorations = [];
          const searchTerm = 'test';
          const fullText = state.doc.textContent;
          const allPositions = findAllPositions(fullText, searchTerm);
          
          state.doc.descendants((node, pos) => {
            if (!node.isText) return;
            
            allPositions.forEach(position => {
              const nodeStart = pos;
              const nodeEnd = pos + node.text.length;
              
              if (position.from >= nodeStart && position.to <= nodeEnd) {
                decorations.push(
                  Decoration.inline(
                    position.from,
                    position.to,
                    { 
                      class: 'highlight-yellow',
                      'data-position': `${position.from}-${position.to}`
                    }
                  )
                );
              }
            });
          });

          return DecorationSet.create(state.doc, decorations);
        }
      }
    });
    return [plugin];
  }
});

export default function TestTipTapPage() {
  console.log('Component rendering');
  const [content, setContent] = useState(initialContent);
  const [positions, setPositions] = useState([]);
  const [mounted, setMounted] = useState(false);
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      PositionTrackingHighlight
    ],
    content,
    onUpdate: ({ editor }) => {
      console.log('Editor updated');
      const newText = editor.getText();
      const newPositions = findAllPositions(newText, 'test');
      setContent(newText);
      setPositions(newPositions);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none'
      }
    },
    onCreate: ({ editor }) => {
      console.log('Editor created');
      setMounted(true);
    }
  });

  useEffect(() => {
    if (editor && mounted) {
      const newPositions = findAllPositions(editor.getText(), 'test');
      setPositions(newPositions);
    }
  }, [editor, mounted]);

  const handleReplace = useCallback(() => {
    if (!editor || positions.length === 0) return;
    
    const firstPos = positions[0];
    
    editor
      .chain()
      .focus()
      .insertContentAt(
        { from: firstPos.from, to: firstPos.to },
        'example'
      )
      .run();
  }, [editor, positions]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .highlight-yellow {
        background-color: #fef08a;
        border-radius: 4px;
        padding: 2px;
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  if (!editor) {
    console.log('Editor not initialized');
    return <div>Loading editor...</div>;
  }

  console.log('Rendering editor content');
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">TipTap Position Tracking Test</h1>
      
      <div className="border-2 border-gray-200 rounded-lg p-4 mb-6 bg-white">
        <EditorContent editor={editor} />
      </div>

      <button 
        onClick={handleReplace}
        disabled={!positions.length}
        className={`px-4 py-2 rounded-lg text-white ${
          positions.length ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer' : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        Replace First "test" with "example"
      </button>

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-3">Debug Info:</h3>
        <pre className="bg-gray-50 p-4 rounded-lg overflow-auto">
          {JSON.stringify({ 
            content,
            positions,
            highlightCount: positions.length,
            mounted,
            editorExists: !!editor
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
} 