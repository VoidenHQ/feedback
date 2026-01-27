import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance, Props } from 'tippy.js';
import { FAKER_FUNCTIONS } from './fakerEngine';
import { FakerSuggestionList } from './FakerSuggestionList';

export const FakerSuggestionPluginKey = new PluginKey('fakerSuggestion');

/**
 * Tiptap extension for {{$faker.XXX()}} suggestions in tables and rich text
 * Triggers when user types {{$faker.
 */
export const FakerSuggestion = Extension.create({
  name: 'fakerSuggestion',

  addOptions() {
    return {
      suggestion: {
        char: '{{$faker.',
        pluginKey: FakerSuggestionPluginKey,

        command: ({ editor, range, props }: any) => {
          // Insert the selected faker function
          const fakerText = `{{$faker.${props.path}()}}`;

          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent(fakerText)
            .run();
        },

        allow: ({ state, range }: any) => {
          // Check if we're in a table cell or paragraph
          const $from = state.doc.resolve(range.from);
          const nodeType = $from.parent.type.name;

          // Allow in table cells and paragraphs
          return nodeType === 'tableCell' || nodeType === 'paragraph';
        },

        items: ({ query }: { query: string }) => {
          // Filter faker functions based on what user has typed
          return FAKER_FUNCTIONS
            .filter(fn => fn.path.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 10);
        },

        render: () => {
          let component: ReactRenderer;
          let popup: Instance<Props>[];

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(FakerSuggestionList, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                theme: 'faker-suggestion',
                maxWidth: 400,
              });
            },

            onUpdate(props: any) {
              component.updateProps(props);

              if (!props.clientRect) {
                return;
              }

              popup[0].setProps({
                getReferenceClientRect: props.clientRect,
              });
            },

            onKeyDown(props: any) {
              if (props.event.key === 'Escape') {
                popup[0].hide();
                return true;
              }
              // @ts-expect-error - component.ref is accessible
              return component.ref?.onKeyDown(props);
            },

            onExit() {
              popup[0].destroy();
              component.destroy();
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
