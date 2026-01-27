import { autocompletion, CompletionContext } from "@codemirror/autocomplete";

export function refAutocomplete(links: string[]) {
  return autocompletion({
    override: [
      (context: CompletionContext) => {
        const word = context.matchBefore(/.*\$ref:\s*/);

        if (!word || word.from == word.to) return null;

        const from = word.from + word.text.indexOf("$ref:") + 6; // 6 is the length of "$ref: + whitespace"
        const to = context.pos;

        if (from > to) return null;

        return {
          from,
          to,
          options: links.map((link) => ({
            label: link,
            type: "constant",
            apply: `"${link}"`,
          })),
        };
      },
    ],
  });
}
