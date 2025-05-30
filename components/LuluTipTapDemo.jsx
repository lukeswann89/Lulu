"use client";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Plugin, PluginKey } from "prosemirror-state";
import { DecorationSet, Decoration } from "prosemirror-view";

const HighlightExtension = Extension.create({
  name: 'highlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('highlight'),
        props: {
          decorations: state => {
            const decorations = [];
            const regex = /test/g;

            state.doc.descendants((node, pos) => {
              if (node.isText) {
                let match;
                while ((match = regex.exec(node.text)) !== null) {
                  const start = pos + match.index;
                  const end = start + match[0].length;
                  
                  decorations.push(
                    Decoration.inline(start, end, {
                      class: 'highlight-text',
                      style: 'background-color: #ffe29b; border-radius: 4px; padding: 2px;'
                    })
                  );
                }
              }
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

function LuluTipTapDemo() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      HighlightExtension,
    ],
    content: '<p>Try typing the word "test" anywhere in this editor. It should highlight all "test" words.</p>',
    editable: true,
    autofocus: true,
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">TipTap Highlight Demo</h2>
      <div className="prose max-w-none">
        <EditorContent 
          editor={editor} 
          className="min-h-[200px] border border-gray-300 rounded-lg p-4 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all"
        />
      </div>
    </div>
  );
}

export default LuluTipTapDemo;
