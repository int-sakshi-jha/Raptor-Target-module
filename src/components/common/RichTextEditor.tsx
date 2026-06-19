import React, { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import toast from "react-hot-toast";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link2,
  Minus,
  Quote,
  RemoveFormatting,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Trash2,
} from "lucide-react";

export type RichTextEditorProps = {
  label?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  minHeight?: string;
  disabled?: boolean;
};

/** ~800 KB — keeps base64 HTML within announcement content limits. */
const MAX_IMAGE_BYTES = 800 * 1024;

const toolbarButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-xs border border-neutral-200 text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-dark-300 dark:text-neutral-dark-700 dark:hover:bg-neutral-dark-300";

const bubbleMenuClass =
  "flex flex-wrap items-center gap-0.5 rounded-xs border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-dark-300 dark:bg-neutral-dark-100";

type ToolbarButtonProps = {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  title,
  active = false,
  disabled = false,
  onClick,
  children,
}) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={`${toolbarButtonClass} ${
      active ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-300" : ""
    }`}
  >
    {children}
  </button>
);

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  label,
  value,
  onChange,
  placeholder = "Write announcement content…",
  required = false,
  error,
  minHeight = "180px",
  disabled = false,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Highlight,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Subscript,
      Superscript,
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editable: !disabled,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  const setLink = () => {
    if (!editor || disabled) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", previousUrl || "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const openImagePicker = () => {
    if (!editor || disabled) return;
    imageInputRef.current?.click();
  };

  const handleImageFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be smaller than 800 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      if (typeof src !== "string") return;
      editor.chain().focus().setImage({ src }).run();
    };
    reader.onerror = () => toast.error("Could not read the image file.");
    reader.readAsDataURL(file);
  };

  const insertTable = () => {
    if (!editor || disabled) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  const toolbarDisabled = disabled || !editor;

  return (
    <div className="w-full">
      {label ? (
        <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
          {required ? <sup className="text-error-500"> *</sup> : null}
        </label>
      ) : null}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={handleImageFile}
      />

      <div
        className={`overflow-hidden rounded-xs border bg-neutral-0 dark:bg-neutral-dark-200 ${
          error
            ? "border-error-500 dark:border-error-500"
            : "border-neutral-200 dark:border-neutral-dark-300"
        } ${disabled ? "opacity-60" : ""}`}
      >
        {/* TipTap has no full default toolbar — BubbleMenu is the official selection menu. */}
        {editor ? (
          <BubbleMenu editor={editor} className={bubbleMenuClass}>
            <ToolbarButton
              title="Bold"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Italic"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Underline"
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Highlight"
              active={editor.isActive("highlight")}
              onClick={() => editor.chain().focus().toggleHighlight().run()}
            >
              <Highlighter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Subscript"
              active={editor.isActive("subscript")}
              onClick={() => editor.chain().focus().toggleSubscript().run()}
            >
              <SubscriptIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Superscript"
              active={editor.isActive("superscript")}
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
            >
              <SuperscriptIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Align left"
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            >
              <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Align center"
              active={editor.isActive({ textAlign: "center" })}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            >
              <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Align right"
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            >
              <AlignRight className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Insert link"
              active={editor.isActive("link")}
              onClick={setLink}
            >
              <Link2 className="h-4 w-4" />
            </ToolbarButton>
          </BubbleMenu>
        ) : null}

        {/* Fixed bar: block inserts & structure (select text for inline formatting above). */}
        <div className="flex flex-wrap gap-1 border-b border-neutral-200 bg-neutral-50 px-2 py-1.5 dark:border-neutral-dark-300 dark:bg-neutral-dark-100">
          <ToolbarButton
            title="Heading"
            disabled={toolbarDisabled}
            active={editor?.isActive("heading", { level: 2 })}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <span className="text-xs font-semibold">H</span>
          </ToolbarButton>
          <ToolbarButton
            title="Bullet list"
            disabled={toolbarDisabled}
            active={editor?.isActive("bulletList")}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Numbered list"
            disabled={toolbarDisabled}
            active={editor?.isActive("orderedList")}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Blockquote"
            disabled={toolbarDisabled}
            active={editor?.isActive("blockquote")}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Horizontal rule"
            disabled={toolbarDisabled}
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Insert image from device"
            disabled={toolbarDisabled}
            onClick={openImagePicker}
          >
            <ImageIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Insert table"
            disabled={toolbarDisabled}
            active={editor?.isActive("table")}
            onClick={insertTable}
          >
            <TableIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Add column before"
            disabled={toolbarDisabled || !editor?.isActive("table")}
            onClick={() => editor?.chain().focus().addColumnBefore().run()}
          >
            <span className="text-[10px] font-semibold">C+</span>
          </ToolbarButton>
          <ToolbarButton
            title="Add row below"
            disabled={toolbarDisabled || !editor?.isActive("table")}
            onClick={() => editor?.chain().focus().addRowAfter().run()}
          >
            <span className="text-[10px] font-semibold">R+</span>
          </ToolbarButton>
          <ToolbarButton
            title="Delete table"
            disabled={toolbarDisabled || !editor?.isActive("table")}
            onClick={() => editor?.chain().focus().deleteTable().run()}
          >
            <Trash2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Clear formatting"
            disabled={toolbarDisabled}
            onClick={() =>
              editor?.chain().focus().clearNodes().unsetAllMarks().run()
            }
          >
            <RemoveFormatting className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <EditorContent
          editor={editor}
          className="tiptap-editor px-3 py-2 text-sm text-neutral-900 dark:text-neutral-dark-950"
          style={{ minHeight }}
        />
      </div>

      {error ? <p className="mt-1 text-xs text-error-500">{error}</p> : null}
    </div>
  );
};

export default RichTextEditor;
