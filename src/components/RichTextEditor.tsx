import React, { useRef, useCallback } from 'react';
import { MdFormatBold, MdFormatItalic, MdFormatUnderlined, MdFormatListBulleted, MdFormatListNumbered, MdTitle } from 'react-icons/md';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const wrapSelection = (text: string, selectionStart: number, selectionEnd: number, before: string, after: string): [string, number, number] => {
  const selected = text.substring(selectionStart, selectionEnd);
  const newText = text.substring(0, selectionStart) + before + selected + after + text.substring(selectionEnd);
  const newStart = selectionStart + before.length;
  const newEnd = newStart + selected.length;
  return [newText, newStart, newEnd];
};

const wrapBlock = (text: string, selectionStart: number, selectionEnd: number, tag: string): [string, number, number] => {
  const lineStart = text.lastIndexOf('\n', selectionStart - 1) + 1;
  const before = `<${tag}>`;
  const after = `</${tag}>`;
  const newText = text.substring(0, lineStart) + before + text.substring(lineStart, selectionEnd) + after + text.substring(selectionEnd);
  const newStart = text === '' ? before.length : selectionStart + before.length;
  const newEnd = selectionEnd + before.length + after.length;
  return [newText, newStart, newEnd];
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = useCallback((type: string, tag?: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    let text = ta.value;
    let newStart = start;
    let newEnd = end;

    switch (type) {
      case 'bold':
        [text, newStart, newEnd] = wrapSelection(text, start, end, '<strong>', '</strong>');
        break;
      case 'italic':
        [text, newStart, newEnd] = wrapSelection(text, start, end, '<em>', '</em>');
        break;
      case 'underline':
        [text, newStart, newEnd] = wrapSelection(text, start, end, '<u>', '</u>');
        break;
      case 'heading': {
        const hTag = tag || 'h1';
        [text, newStart, newEnd] = wrapBlock(text, start, end, hTag);
        break;
      }
      case 'bullet': {
        const lines = text.substring(start, end).split('\n');
        const bulleted = lines.map(l => (l.trim() ? `<li>${l}</li>` : '')).join('\n');
        text = text.substring(0, start) + `<ul>\n${bulleted}\n</ul>` + text.substring(end);
        newStart = start;
        newEnd = text.length;
        break;
      }
      case 'numbered': {
        const lines2 = text.substring(start, end).split('\n');
        const numbered = lines2.map(l => (l.trim() ? `<li>${l}</li>` : '')).join('\n');
        text = text.substring(0, start) + `<ol>\n${numbered}\n</ol>` + text.substring(end);
        newStart = start;
        newEnd = text.length;
        break;
      }
    }

    onChange(text);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(newStart, newEnd);
    });
  }, [onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const btnClass = 'rich-text-toolbar-btn';

  return (
    <div className="rich-text-editor">
      <div className="rich-text-toolbar" onMouseDown={(e) => e.preventDefault()}>
        <button type="button" className={btnClass} onMouseDown={() => applyFormat('bold')} title="Bold">
          <MdFormatBold size={16} />
        </button>
        <button type="button" className={btnClass} onMouseDown={() => applyFormat('italic')} title="Italic">
          <MdFormatItalic size={16} />
        </button>
        <button type="button" className={btnClass} onMouseDown={() => applyFormat('underline')} title="Underline">
          <MdFormatUnderlined size={16} />
        </button>
        <span className="rich-text-separator" />
        <button type="button" className={btnClass} onMouseDown={() => applyFormat('heading', 'h1')} title="Heading 1">
          <MdTitle size={16} />1
        </button>
        <button type="button" className={btnClass} onMouseDown={() => applyFormat('heading', 'h2')} title="Heading 2">
          <MdTitle size={16} />2
        </button>
        <button type="button" className={btnClass} onMouseDown={() => applyFormat('heading', 'h3')} title="Heading 3">
          <MdTitle size={16} />3
        </button>
        <span className="rich-text-separator" />
        <button type="button" className={btnClass} onMouseDown={() => applyFormat('bullet')} title="Bullet List">
          <MdFormatListBulleted size={16} />
        </button>
        <button type="button" className={btnClass} onMouseDown={() => applyFormat('numbered')} title="Numbered List">
          <MdFormatListNumbered size={16} />
        </button>
      </div>
      <textarea
        ref={textareaRef}
        className="rich-text-editor-textarea"
        value={value}
        onChange={handleChange}
        placeholder={placeholder || ''}
        rows={8}
      />
    </div>
  );
};

export default RichTextEditor;
