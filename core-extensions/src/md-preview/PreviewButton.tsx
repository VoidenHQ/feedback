import { BookOpen } from "lucide-react";
import { PluginContext } from '@voiden/sdk/ui';

export const createPreviewButton = (
  context: PluginContext,
  parseMarkdown: (markdown: string, schema?: any) => any
) => {
  return ({ tab }: { tab: any }) => {
    const handlePreview = async () => {
      try {
        // Step 1: Get the markdown content from the currently open .md file
        const codeEditor = context.project.getActiveEditor('code');
        if (!codeEditor) {
          return;
        }

        const markdownContent = codeEditor.state.doc.toString();
        if (!markdownContent) {
          return;
        }

        // Step 2: Parse markdown to Voiden JSON using self-contained parser
        // The parser returns a full doc object { type: 'doc', content: [...] }
        const previewDoc = parseMarkdown(markdownContent);

        // Step 3: Open a NEW read-only Voiden tab for preview
        await context.openVoidenTab(
          `Preview: ${tab.title}`,
          previewDoc,
          { readOnly: true }
        );

        // Step 4: Toggle the right panel to show/hide the preview
        context.ui.toggleRightPanel();
      } catch (error) {
      }
    };

    return (
      <button
        className="p-1 hover:bg-active rounded-sm"
        onClick={handlePreview}
        title="Preview Markdown"
      >
        <BookOpen size={14} />
      </button>
    );
  };
};
