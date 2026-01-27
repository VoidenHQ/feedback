/**
 * Markdown Preview Extension
 *
 * Enables markdown preview functionality for .md files in the editor.
 *
 * Features:
 * - Toggle between edit and preview modes for markdown files
 * - GitHub Flavored Markdown support (tables, strikethrough, task lists)
 * - Custom link rendering with external link handling
 * - YAML frontmatter support
 *
 * When enabled, this extension allows users to preview rendered markdown
 * by clicking the preview toggle button in the editor toolbar.
 */

import { PluginContext } from '@voiden/sdk/ui';
import { TogglePreview, useMdViewStore } from './TogglePreview';
import { Preview } from './Preview';

const mdPreviewPlugin = (context: PluginContext) => {
  return {
    onload: () => {

      // Inject prose classes into Preview component
      Preview.proseClasses = context.ui.getProseClasses();

      // Expose helpers for core to use dynamically
      context.exposeHelpers({
        useMdViewStore,
        Preview,
      });

      // Register the preview toggle button as an editor action
      context.registerEditorAction({
        id: 'md-preview-toggle',
        component: TogglePreview,
        predicate: (tab) => {
          // Only show for .md files
          return tab.title?.endsWith('.md');
        },
      });

    },
    onunload: () => {
    },
  };
};

export default mdPreviewPlugin;
