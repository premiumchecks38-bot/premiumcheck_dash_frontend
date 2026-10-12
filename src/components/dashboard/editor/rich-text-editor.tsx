"use client";

import * as React from "react";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import Typography from "@tiptap/extension-typography";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import {
  AlertTriangle,
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Info,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Table as TableIcon,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { MediaPicker } from "@/components/dashboard/media/media-picker";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/dashboard/primitives";
import { Button } from "@/components/ui/button";
import type { Media, MediaFolder } from "@/lib/api/schemas";
import { admin } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { uploadImage } from "@/lib/media/upload";
import { CLEANED_NOTE, cleanText, needsCleaning } from "@/lib/text/clean";
import { cn } from "@/lib/utils/cn";

import { AltTextDialog } from "./alt-text-dialog";
import { Callout } from "./callout";
import { LinkDialog, type LinkValue } from "./link-dialog";
import { cleanPastedHtml, cleanPastedText } from "./paste";

export const WORDS_PER_MINUTE = 200;

export interface RichTextEditorProps {
  id: string;
  /** Accessible name of the editing area. */
  label: string;
  /** Editor JSON (blog, pages) or sanitised HTML (services, areas). */
  value: JSONContent | string | null;
  onChange: (value: JSONContent | string) => void;
  output?: "json" | "html";
  placeholder?: string;
  /** Media folder for pasted or dropped images. */
  folder?: MediaFolder;
  readOnly?: boolean;
  minimal?: boolean;
  describedBy?: string;
}

/** Image source for content: a resized Cloudinary URL from our own cloud. */
function contentImageSrc(media: Media): string {
  return media.urls.hero || media.secure_url;
}

/**
 * The content editor (Tiptap). Headings start at H2 because the page title is the H1. Images
 * only come from the media library: pasted or dropped image files are uploaded to Cloudinary
 * through the media flow first, then inserted, and need alt text. The output is the editor
 * JSON the backend renders and sanitises (or HTML for services and areas, which the backend
 * sanitises too).
 */
export default function RichTextEditor({
  id,
  label,
  value,
  onChange,
  output = "json",
  placeholder = "Start writing...",
  folder = "general",
  readOnly,
  minimal,
  describedBy,
}: RichTextEditorProps) {
  const [cleaned, setCleaned] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(0);
  const [pending, setPending] = React.useState<Media[]>([]);
  const changeRef = React.useRef(onChange);
  React.useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);
  const editorRef = React.useRef<Editor | null>(null);

  const uploadFiles = React.useCallback(
    (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (!images.length) return false;
      for (const file of images) {
        setUploading((n) => n + 1);
        uploadImage(file, folder, () => undefined)
          .then((media) => {
            // Added once it has alt text (asked for in the dialog below).
            setPending((queue) => [...queue, media]);
          })
          .catch((error: unknown) => toast.error(errorMessage(error)))
          .finally(() => setUploading((n) => n - 1));
      }
      return true;
    },
    [folder],
  );

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: { rel: "noopener noreferrer" },
        },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Callout,
      // Smart quotes and ellipses, but never em or en dashes.
      Typography.configure({ emDash: false }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: value ?? "",
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        class: "pc-editor-content min-h-64 px-5 py-4 focus:outline-none",
      },
      transformPastedHTML: (html) => {
        const out = cleanPastedHtml(html);
        if (needsCleaning(html.replace(/<[^>]+>/g, ""))) setCleaned(true);
        return out;
      },
      transformPastedText: (text) => {
        if (needsCleaning(text)) setCleaned(true);
        return cleanPastedText(text);
      },
      handleTextInput: (view, from, to, text) => {
        if (!needsCleaning(text)) return false;
        view.dispatch(view.state.tr.insertText(cleanText(text), from, to));
        setCleaned(true);
        return true;
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.length && uploadFiles(files)) {
          event.preventDefault();
          return true;
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (files.length && uploadFiles(files)) {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: current }) => {
      changeRef.current(output === "html" ? current.getHTML() : current.getJSON());
    },
  });

  React.useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            link: e.isActive("link"),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            table: e.isActive("table"),
            calloutInfo: e.isActive("callout", { tone: "info" }),
            calloutWarning: e.isActive("callout", { tone: "warning" }),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
            words: (e.storage.characterCount as { words: () => number }).words(),
            linkHref: (e.getAttributes("link").href as string | undefined) ?? "",
            linkTarget: (e.getAttributes("link").target as string | undefined) ?? "",
          }
        : null,
  });

  const words = state?.words ?? 0;
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));

  const applyLink = (link: LinkValue | null) => {
    if (!editor) return;
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!link) chain.unsetLink().run();
    else chain.setLink({ href: link.href, target: link.newTab ? "_blank" : null }).run();
  };

  const insertImage = (media: Media) => {
    editor
      ?.chain()
      .focus()
      .setImage({ src: contentImageSrc(media), alt: media.alt_text ?? "" })
      .run();
  };

  const tool = (
    name: string,
    icon: React.ReactNode,
    action: () => void,
    options: { active?: boolean; disabled?: boolean; testId?: string } = {},
  ) => (
    <Button
      type="button"
      variant="control"
      size="none"
      aria-label={name}
      title={name}
      aria-pressed={options.active}
      disabled={!editor || (readOnly ?? false) || (options.disabled ?? false)}
      onClick={action}
      data-testid={options.testId}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-md text-text hover:bg-surface-alt",
        options.active && "bg-surface-alt text-primary",
      )}
    >
      {icon}
    </Button>
  );

  const icon = "h-4 w-4";

  return (
    <div
      className="overflow-hidden rounded-md border-thin border-border bg-background focus-within:outline-focus focus-within:outline-focus-ring"
      data-testid="rich-text-editor"
    >
      {readOnly ? null : (
        <div
          role="toolbar"
          aria-label={`${label} formatting`}
          aria-controls={id}
          className="flex flex-wrap items-center gap-0.5 border-b-thin border-border bg-surface px-2 py-1"
        >
          {tool(
            "Heading 2",
            <Heading2 className={icon} aria-hidden="true" />,
            () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
            { active: state?.h2 },
          )}
          {tool(
            "Heading 3",
            <Heading3 className={icon} aria-hidden="true" />,
            () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
            { active: state?.h3 },
          )}
          <span className="mx-1 h-6 border-l-thin border-border" aria-hidden="true" />
          {tool(
            "Bold",
            <Bold className={icon} aria-hidden="true" />,
            () => editor?.chain().focus().toggleBold().run(),
            { active: state?.bold },
          )}
          {tool(
            "Italic",
            <Italic className={icon} aria-hidden="true" />,
            () => editor?.chain().focus().toggleItalic().run(),
            { active: state?.italic },
          )}
          {tool("Link", <Link2 className={icon} aria-hidden="true" />, () => setLinkOpen(true), {
            active: state?.link,
            testId: "editor-link",
          })}
          <span className="mx-1 h-6 border-l-thin border-border" aria-hidden="true" />
          {tool(
            "Bulleted list",
            <List className={icon} aria-hidden="true" />,
            () => editor?.chain().focus().toggleBulletList().run(),
            { active: state?.bullet },
          )}
          {tool(
            "Numbered list",
            <ListOrdered className={icon} aria-hidden="true" />,
            () => editor?.chain().focus().toggleOrderedList().run(),
            { active: state?.ordered },
          )}
          {tool(
            "Quote",
            <Quote className={icon} aria-hidden="true" />,
            () => editor?.chain().focus().toggleBlockquote().run(),
            { active: state?.quote },
          )}
          {minimal ? null : (
            <>
              {tool(
                "Information box",
                <Info className={icon} aria-hidden="true" />,
                () =>
                  state?.calloutInfo
                    ? editor?.chain().focus().unsetCallout().run()
                    : editor?.chain().focus().setCallout("info").run(),
                { active: state?.calloutInfo },
              )}
              {tool(
                "Warning box",
                <AlertTriangle className={icon} aria-hidden="true" />,
                () =>
                  state?.calloutWarning
                    ? editor?.chain().focus().unsetCallout().run()
                    : editor?.chain().focus().setCallout("warning").run(),
                { active: state?.calloutWarning },
              )}
              <Menu>
                <MenuTrigger asChild>
                  <Button
                    type="button"
                    variant="control"
                    size="none"
                    aria-label="Table"
                    title="Table"
                    disabled={!editor}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-md text-text hover:bg-surface-alt",
                      state?.table && "bg-surface-alt text-primary",
                    )}
                  >
                    <TableIcon className={icon} aria-hidden="true" />
                  </Button>
                </MenuTrigger>
                <MenuContent align="start">
                  <MenuItem
                    onSelect={() =>
                      editor
                        ?.chain()
                        .focus()
                        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                        .run()
                    }
                  >
                    Insert a table
                  </MenuItem>
                  {state?.table ? (
                    <>
                      <MenuSeparator />
                      <MenuItem onSelect={() => editor?.chain().focus().addRowAfter().run()}>
                        Add a row
                      </MenuItem>
                      <MenuItem onSelect={() => editor?.chain().focus().addColumnAfter().run()}>
                        Add a column
                      </MenuItem>
                      <MenuItem onSelect={() => editor?.chain().focus().deleteRow().run()}>
                        Delete this row
                      </MenuItem>
                      <MenuItem onSelect={() => editor?.chain().focus().deleteColumn().run()}>
                        Delete this column
                      </MenuItem>
                      <MenuItem onSelect={() => editor?.chain().focus().deleteTable().run()}>
                        Delete the table
                      </MenuItem>
                    </>
                  ) : null}
                </MenuContent>
              </Menu>
              {tool(
                "Image from the media library",
                <ImagePlus className={icon} aria-hidden="true" />,
                () => setPickerOpen(true),
                { testId: "editor-image" },
              )}
              {tool("Divider line", <Minus className={icon} aria-hidden="true" />, () =>
                editor?.chain().focus().setHorizontalRule().run(),
              )}
            </>
          )}
          <span className="mx-1 h-6 border-l-thin border-border" aria-hidden="true" />
          {tool(
            "Undo",
            <Undo2 className={icon} aria-hidden="true" />,
            () => editor?.chain().focus().undo().run(),
            { disabled: !state?.canUndo },
          )}
          {tool(
            "Redo",
            <Redo2 className={icon} aria-hidden="true" />,
            () => editor?.chain().focus().redo().run(),
            { disabled: !state?.canRedo },
          )}
        </div>
      )}

      <EditorContent editor={editor} className="pc-editor" />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t-thin border-border bg-surface px-4 py-2 font-body text-caption text-text-muted">
        <span role="status">
          {cleaned
            ? CLEANED_NOTE
            : uploading
              ? `Uploading ${String(uploading)} image${uploading === 1 ? "" : "s"}...`
              : ""}
        </span>
        <span data-testid="editor-word-count">
          {words} {words === 1 ? "word" : "words"}, about {minutes} min read
        </span>
      </div>

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        folder={folder}
        title="Add an image"
        onSelect={insertImage}
      />
      <AltTextDialog
        media={pending[0] ?? null}
        onDone={(media, alt) => {
          setPending((queue) => queue.slice(1));
          if (!media || !alt) {
            if (media)
              toast.info("The image is in the media library but was not added: it needs alt text.");
            return;
          }
          editor
            ?.chain()
            .focus()
            .setImage({ src: contentImageSrc(media), alt })
            .run();
          void admin(`/media/${media.id}`, { method: "PATCH", json: { alt_text: alt } });
        }}
      />
      <LinkDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        initial={
          state?.link ? { href: state.linkHref, newTab: state.linkTarget === "_blank" } : null
        }
        onApply={applyLink}
      />
    </div>
  );
}
