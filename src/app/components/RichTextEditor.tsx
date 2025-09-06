// src/app/components/RichTextEditor.tsx

"use client";

import { Editor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { ResizableImage } from 'tiptap-extension-resizable-image';
import { useCallback, useEffect, useState } from 'react';

// MenuBar 컴포넌트
const MenuBar = ({ editor }: { editor: Editor | null }) => {
    const addImage = useCallback(() => {
        if (!editor) return;
        const url = window.prompt('이미지 URL을 입력하세요:');
        if (url) {
            // ✨ setImage를 setResizableImage로 수정했습니다.
            editor.chain().focus().setResizableImage({ src: url }).run();
        }
    }, [editor]);

    const setLink = useCallback(() => {
        if (!editor) return;
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL을 입력하세요', previousUrl);

        if (url === null) { return; }
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    if (!editor) { return null; }

    return (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-700 border border-gray-600 rounded-t-md">
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'bg-blue-500 p-2 rounded' : 'p-2 rounded hover:bg-gray-600'}>Bold</button>
            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'bg-blue-500 p-2 rounded' : 'p-2 rounded hover:bg-gray-600'}>Italic</button>
            <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'bg-blue-500 p-2 rounded' : 'p-2 rounded hover:bg-gray-600'}>Strike</button>
            <button type="button" onClick={addImage} className="p-2 rounded hover:bg-gray-600">Image</button>
            <button type="button" onClick={setLink} className={editor.isActive('link') ? 'bg-blue-500 p-2 rounded' : 'p-2 rounded hover:bg-gray-600'}>
                Set Link
            </button>
            <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')} className="p-2 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                Unset Link
            </button>
        </div>
    );
};

// 메인 에디터 컴포넌트
const RichTextEditor = ({ content, onChange }: { content: string, onChange: (html: string) => void }) => {
    const [editor, setEditor] = useState<Editor | null>(null);

    useEffect(() => {
        const tiptapEditor = new Editor({
            extensions: [
                StarterKit,
                Link.configure({ openOnClick: false, autolink: true }),
                ResizableImage,
            ],
            content: content,
            editorProps: {
                attributes: {
                    class: 'prose prose-invert max-w-none p-3 min-h-[250px] bg-gray-700 border-t-0 border-gray-600 rounded-b-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white',
                },
            },
            onUpdate: ({ editor }) => {
                onChange(editor.getHTML());
            },
        });

        setEditor(tiptapEditor);

        return () => {
            tiptapEditor.destroy();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div>
            <MenuBar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    );
};

export default RichTextEditor;