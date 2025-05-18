// /components/LuluEditor.jsx

import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import Heading from '@tiptap/extension-heading'
import Paragraph from '@tiptap/extension-paragraph'

export default function LuluEditor({ value, setValue }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Bold,
      Italic,
      Underline,
      BulletList,
      OrderedList,
      ListItem,
      Heading.configure({ levels: [1,2,3] }),
      Paragraph
    ],
    content: value,
    onUpdate: ({ editor }) => {
      setValue(editor.getHTML())
    }
  })

  if (!editor) return <div>Loading editor...</div>

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        <button onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-purple-200 rounded px-2 py-1 font-bold' : 'px-2 py-1'}>
          <b>B</b>
        </button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-purple-200 rounded px-2 py-1 font-bold italic' : 'px-2 py-1'}>
          <i>I</i>
        </button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'bg-purple-200 rounded px-2 py-1 font-bold underline' : 'px-2 py-1'}>
          <u>U</u>
        </button>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-purple-200 rounded px-2 py-1' : 'px-2 py-1'}>
          • Bulleted List
        </button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-purple-200 rounded px-2 py-1' : 'px-2 py-1'}>
          1. Numbered List
        </button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'bg-purple-200 rounded px-2 py-1' : 'px-2 py-1'}>
          H1
        </button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-purple-200 rounded px-2 py-1' : 'px-2 py-1'}>
          H2
        </button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'bg-purple-200 rounded px-2 py-1' : 'px-2 py-1'}>
          H3
        </button>
        <button onClick={() => editor.chain().focus().undo().run()} className="px-2 py-1">⎌ Undo</button>
        <button onClick={() => editor.chain().focus().redo().run()} className="px-2 py-1">⎌ Redo</button>
      </div>
      <div className="border rounded-lg p-2 min-h-[300px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
