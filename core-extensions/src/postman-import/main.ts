/**
 * Postman Collection Importer Extension
 *
 * Enables importing Postman collections (v2.1) and converting them to Voiden .void request files.
 *
 * Features:
 * - Import Postman collections from JSON files
 * - Automatic conversion to Voiden's .void format
 * - Preserves folder structure from collections
 * - Supports headers, request bodies, and query parameters
 * - Progress tracking during import
 *
 * When enabled, this extension adds an import button when viewing .json files
 * that contain Postman collections.
 */

import { PluginContext } from '@voiden/sdk/ui';
import React from 'react';
import { PostmanImportButton } from './components/PostmanImportButton';

const postmanImportPlugin = (context: PluginContext) => {
  const showToast = (context as any)?.ui?.showToast as
    | ((message: string, type?: 'info' | 'success' | 'warning' | 'error') => void)
    | undefined;

  return {
    onload: () => {
      // Register the import button as an editor action
      // Note: The component will use context.helpers.from('voiden-wrapper-api-extension')
      context.registerEditorAction({
        id: 'postman-import-button',
        component: (props: any) =>
          React.createElement(PostmanImportButton, {
            ...props,
            showToast,
          }),
        predicate: (tab) => {
          // Only show for .json files
          return tab.title?.endsWith('.json') && tab.content?.indexOf('postman') > -1;
        },
      });

    },
    onunload: () => {
    },
  };
};

export default postmanImportPlugin;
