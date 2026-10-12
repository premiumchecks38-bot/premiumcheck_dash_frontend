import { mergeAttributes, Node } from "@tiptap/core";

export type CalloutTone = "info" | "warning";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      /** Wrap the selection in a callout box, or change the tone of the one it is in. */
      setCallout: (tone: CalloutTone) => ReturnType;
      /** Remove the callout box around the selection. */
      unsetCallout: () => ReturnType;
    };
  }
}

/**
 * A highlighted box (information or warning). Stored in the editor JSON as
 * {"type": "callout", "attrs": {"tone": "info"}} and rendered by the backend as
 * <aside class="callout callout-info">, which the website styles.
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "paragraph+",
  defining: true,

  addAttributes() {
    return {
      tone: {
        default: "info" as CalloutTone,
        parseHTML: (element: HTMLElement) =>
          element.classList.contains("callout-warning") ? "warning" : "info",
        renderHTML: (attributes: { tone?: CalloutTone }) => ({
          class: `callout callout-${attributes.tone === "warning" ? "warning" : "info"}`,
          "data-tone": attributes.tone === "warning" ? "warning" : "info",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "aside.callout" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["aside", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCallout:
        (tone) =>
        ({ commands, editor }) =>
          editor.isActive(this.name)
            ? commands.updateAttributes(this.name, { tone })
            : commands.wrapIn(this.name, { tone }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});
