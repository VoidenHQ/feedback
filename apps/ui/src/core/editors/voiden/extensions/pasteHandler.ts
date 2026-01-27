/**
 * Paste Handler Extension for VoidenEditor
 *
 * This extension integrates the PasteOrchestrator with TipTap's editor.
 * It intercepts paste events and delegates them to the orchestrator, which
 * routes them through the plugin system based on the paste priority chain.
 *
 * Priority chain (from PasteOrchestrator):
 * a) Pasting inside a Voiden block → Block owner handles
 * b) Block:// prefix (single block copy) → Parse and render
 * c) Full Voiden document → Extract blocks, route to owners
 * d) Partial Voiden content → Route blocks to owners
 * e) Pattern matching (cURL, etc.) → Plugins handle
 * f) Valid markdown → Convert and render
 * g) HTML → Convert and render
 * h) Default → Plain text
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { pasteOrchestrator } from '@/core/paste/pasteOrchestrator';

const pasteHandlerPluginKey = new PluginKey('pasteHandler');

export const PasteHandler = Extension.create({
  name: 'pasteHandler',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pasteHandlerPluginKey,
        props: {
          handlePaste(view, event) {
            // console.debug('[PasteHandler] Paste event intercepted');

            // Delegate to the paste orchestrator
            const handled = pasteOrchestrator.handlePaste(view, event);

            if (handled) {
              // console.debug('[PasteHandler] Paste handled by orchestrator');
              return true;
            }

            // console.debug('[PasteHandler] Paste not handled, using default behavior');
            return false;
          },
        },
      }),
    ];
  },
});
