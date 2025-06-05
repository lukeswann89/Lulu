// /components/LuluEditor.jsx

import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'

export default function LuluEditor({ value, setValue }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
    ],
    content: value,
    immediatelyRender: false, // Fix SSR hydration issues
    onUpdate: ({ editor }) => {
      setValue(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] p-4',
      },
    },
  })

  if (!editor) {
    return (
      <div className="border rounded-lg p-4 min-h-[300px] bg-gray-50 animate-pulse">
        <div className="text-gray-500">Loading editor...</div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border-b">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('bold') 
              ? 'bg-purple-200 text-purple-800' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          type="button"
        >
          <b>B</b>
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('italic') 
              ? 'bg-purple-200 text-purple-800' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          type="button"
        >
          <i>I</i>
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('underline') 
              ? 'bg-purple-200 text-purple-800' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          type="button"
        >
          <u>U</u>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('bulletList') 
              ? 'bg-purple-200 text-purple-800' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          type="button"
        >
          • List
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('orderedList') 
              ? 'bg-purple-200 text-purple-800' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          type="button"
        >
          1. List
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('heading', { level: 1 }) 
              ? 'bg-purple-200 text-purple-800' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          type="button"
        >
          H1
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('heading', { level: 2 }) 
              ? 'bg-purple-200 text-purple-800' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          type="button"
        >
          H2
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            editor.isActive('heading', { level: 3 }) 
              ? 'bg-purple-200 text-purple-800' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          type="button"
        >
          H3
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="px-3 py-1 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          type="button"
        >
          ↶ Undo
        </button>
        
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="px-3 py-1 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          type="button"
        >
          ↷ Redo
        </button>
      </div>

      {/* Editor Content */}
      <div className="min-h-[300px] p-4 bg-white">
        <EditorContent 
          editor={editor} 
          className="prose prose-sm max-w-none focus:outline-none"
        />
      </div>
    </div>
  )
}