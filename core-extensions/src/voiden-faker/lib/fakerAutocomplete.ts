import { CompletionContext, CompletionResult, autocompletion } from '@codemirror/autocomplete';
import { FAKER_FUNCTIONS, getFakerInsertText } from './fakerEngine';

/**
 * CodeMirror autocomplete for {{$faker.XXX()}} in code bodies
 */
export function fakerAutocomplete() {
  return autocompletion({
    override: [
      (context: CompletionContext): CompletionResult | null => {
        // Check if we're inside {{$faker
        const beforeCursor = context.state.sliceDoc(
          Math.max(0, context.pos - 50),
          context.pos
        );

        // Match {{$faker.XXX pattern
        const match = beforeCursor.match(/\{\{\$faker\.([a-zA-Z.]*)$/);

        if (!match) {
          // Also check for just {{$f to trigger initial suggestion
          const initialMatch = beforeCursor.match(/\{\{\$f?$/);
          if (initialMatch) {
            // User typed {{$f, suggest faker prefix
            const from = context.pos - initialMatch[0].length + 2;  // After {{
            return {
              from,
              to: context.pos,
              options: [
                {
                  label: '$faker',
                  type: 'keyword',
                  detail: 'Fake data generator',
                  info: 'Use $faker to generate random fake data',
                  apply: '$faker.',
                },
              ],
            };
          }
          return null;
        }

        const partialPath = match[1];  // e.g., "" or "person" or "person.first"
        const from = context.pos - partialPath.length;

        // Filter functions that match the partial path
        const normalizedQuery = partialPath.toLowerCase();
        const matchingFunctions = FAKER_FUNCTIONS.filter((fn) =>
          fn.path.toLowerCase().includes(normalizedQuery)
        );

        if (matchingFunctions.length === 0) {
          return null;
        }

        return {
          from,
          to: context.pos,
          options: matchingFunctions.flatMap((fn) => {
            const baseOption = {
              label: fn.path,
              type: 'function' as const,
              detail: fn.example,
              info: fn.description,
              apply: getFakerInsertText(fn.path),
              boost: fn.path.split('.').length,
            };

            if (!fn.argsTemplate) {
              return [baseOption];
            }

            return [
              baseOption,
              {
                label: `${fn.path} (params)`,
                type: 'function' as const,
                detail: fn.argsTemplate,
                info: `${fn.description} (with parameter template)`,
                apply: getFakerInsertText(fn.path, true),
                boost: Math.max(1, fn.path.split('.').length - 1),
              },
            ];
          }),
          validFor: /^[a-zA-Z.]*$/,  // Only valid for letters and dots
        };
      },
    ],

    // Configuration
    activateOnTyping: true,
    maxRenderedOptions: 500,
    defaultKeymap: true,
  });
}
