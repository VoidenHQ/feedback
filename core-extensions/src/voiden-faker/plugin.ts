/**
 * Plugin Adapter for Voiden Faker Extension
 *
 * This adapter wraps the UIExtension to work with the plugin system.
 */

import { VoidenFakerExtension } from './extension';

const voidenFakerPlugin = (context: any) => {
  // Create extension instance
  const extension = new VoidenFakerExtension();

  // Store references to registered extensions for cleanup
  let fakerSuggestionExtension: any = null;
  let fakerAutocompleteExtension: any = null;

  // Get hookRegistry from context
  const getHookRegistry = () => {
    // The hookRegistry will be available via dynamic import in the UI app context
    return context.hookRegistry;
  };

  // Create a minimal UIExtensionContext that maps to PluginContext
  const createExtensionContext = () => {
    return {
      pipeline: {
        registerHook: async (stage: string, handler: any, priority?: number) => {

          // Dynamic import of hookRegistry (only works in UI app context)
          try {
            // @ts-ignore - Path resolved at runtime in app context
            const { hookRegistry } = await import(/* @vite-ignore */ '@/core/request-engine/pipeline');
            hookRegistry.registerHook('voiden-faker', stage as any, handler, priority);
          } catch (error) {
          }
        },
      },
      metadata: {
        name: extension.name,
        version: extension.version,
        description: extension.description,
        author: extension.author,
        icon: extension.icon,
      },
    };
  };

  return {
    onload: async () => {

      // Register Tiptap suggestion extension dynamically
      const { FakerSuggestion } = await import('./lib/fakerSuggestion');
      fakerSuggestionExtension = FakerSuggestion;
      context.registerVoidenExtension(FakerSuggestion);

      // Register CodeMirror autocomplete extension dynamically
      const { fakerAutocomplete } = await import('./lib/fakerAutocomplete');
      fakerAutocompleteExtension = fakerAutocomplete();
      context.registerCodemirrorExtension(fakerAutocompleteExtension);

      // Inject context into extension
      const extensionContext = createExtensionContext();
      (extension as any)._setContext(extensionContext);

      // Call extension's onLoad (registers pipeline hook)
      await extension.onLoad();

    },

    onunload: async () => {
      await extension.onUnload?.();

      // Unregister Tiptap extension
      if (fakerSuggestionExtension) {
        context.unregisterVoidenExtension('fakerSuggestion');
      }

      // Unregister CodeMirror extension
      if (fakerAutocompleteExtension) {
        context.unregisterCodemirrorExtension(fakerAutocompleteExtension);
      }

      // Unregister hooks
      try {
        // @ts-ignore - Path resolved at runtime in app context
        const { hookRegistry } = await import(/* @vite-ignore */ '@/core/request-engine/pipeline');
        hookRegistry.unregisterExtension('voiden-faker');
      } catch (error) {
      }
    },
  };
};

export default voidenFakerPlugin;
