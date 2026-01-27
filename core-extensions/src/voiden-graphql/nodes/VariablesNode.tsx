/**
 * GraphQL Variables Node
 *
 * JSON editor for GraphQL variables
 */

import React from "react";
import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

export const createGraphQLVariablesNode = (NodeViewWrapper: any, CodeEditor: any, RequestBlockHeader: any) => {
  const GraphQLVariablesComponent = (props: any) => {
    const [shouldAutofocus, setShouldAutofocus] = React.useState(false);

    // Handle autofocus on creation
    React.useEffect(() => {
      if (props.editor.storage.gqlvariables?.shouldFocusNext) {
        setShouldAutofocus(true);
        const timer = setTimeout(() => {
          if (props.editor.storage.gqlvariables) {
            props.editor.storage.gqlvariables.shouldFocusNext = false;
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [props.editor.storage.gqlvariables?.shouldFocusNext]);

    return (
      <NodeViewWrapper>
        <div className="my-2">
          <RequestBlockHeader
            title="GRAPHQL-VARIABLES"
            withBorder={false}
            editor={props.editor}
          />
          <div style={{ height: 'auto' }}>
            <CodeEditor
              tiptapProps={props}
              lang="json"
              showReplace={false}
              autofocus={shouldAutofocus}
            />
          </div>
        </div>
      </NodeViewWrapper>
    );
  };

  return Node.create({
    name: "gqlvariables",
    group: "block",
    atom: true,
    selectable: true,
    draggable: false,

    addAttributes() {
      return {
        body: {
          default: "{}",
        },
      };
    },

    parseHTML() {
      return [
        {
       Storage() {
      return {
        shouldFocusNext: true,
      };
    },

    tag: "gqlvariables",
          getAttrs: (element) => {
            const body = element.textContent;
            return { body };
          },
        },
      ];
    },

    renderHTML({ HTMLAttributes }) {
      return [
        "div",
        mergeAttributes(HTMLAttributes, { class: "gql-variables-block" }),
      ];
    },

    addNodeView() {
      return ReactNodeViewRenderer(GraphQLVariablesComponent);
    },
  });
};

export const GraphQLVariablesNode = createGraphQLVariablesNode(
  ({ children }: any) => <div>{children}</div>,
  () => <div>CodeEditor not available</div>,
  () => <div>Header not available</div>
);
