'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState, useCallback } from 'react';

export default function ParagraphBlock({ content, onChange }) {
  const [, forceRender] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write your text here...' }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: () => {
      // Force re-render to update toolbar active states
      forceRender(n => n + 1);
    },
    onTransaction: () => {
      forceRender(n => n + 1);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm md:prose-base focus:outline-none min-h-[60px] font-body-lg text-on-surface leading-relaxed max-w-none px-1',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content]); // eslint-disable-line

  if (!editor) return null;

  const ToolbarBtn = ({ onClick, active, title, children }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent focus loss
        onClick();
      }}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${
        active
          ? 'bg-primary text-on-primary'
          : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="w-full">
      {/* Always-visible toolbar */}
      <div className="flex items-center gap-0.5 p-1 mb-2 bg-surface-container-low border border-[#EEEEEE] rounded-lg">
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <span className="font-bold font-serif">B</span>
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <span className="italic font-serif">I</span>
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <span className="line-through font-serif text-sm">S</span>
        </ToolbarBtn>
        <div className="w-px h-5 bg-[#EEEEEE] mx-1" />
        <ToolbarBtn
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive('link')}
          title="Insert Link"
        >
          <span className="material-symbols-outlined text-[16px]">link</span>
        </ToolbarBtn>
        <div className="w-px h-5 bg-[#EEEEEE] mx-1" />
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <span className="material-symbols-outlined text-[16px]">format_list_numbered</span>
        </ToolbarBtn>
      </div>

      <EditorContent editor={editor} />

      <style>{`
        .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        .ProseMirror li { margin: 0.25rem 0; }
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .ProseMirror:focus { outline: none; }
      `}</style>
    </div>
  );
}
