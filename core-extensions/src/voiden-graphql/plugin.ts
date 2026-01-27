/**
 * Voiden GraphQL Plugin
 * 
 * Complete GraphQL client with query/mutation/subscription support
 */

import type { PluginContext } from '@voiden/sdk/ui';
import { parseGraphQLOperation } from './lib/utils';
import manifest from './manifest.json';

export default function createGraphQLPlugin(context: PluginContext) {
  const extendedContext = {
    ...context,
    pipeline: {
      registerHook: async (stage: string, handler: any, priority?: number) => {
        try {
          // @ts-ignore - Vite dynamic import
          const { hookRegistry } = await import(/* @vite-ignore */ '@/core/request-engine/pipeline');
          hookRegistry.registerHook('graphql', stage as any, handler, priority);
        } catch (error) {
          console.error("Failed to register GraphQL hook:", error);
        }
      },
    },
  };

  return {
    onload: async () => {
      // Get context components
      const { NodeViewWrapper, CodeEditor, RequestBlockHeader } = context.ui.components;

      // Import node factories dynamically
      const {
        createGraphQLQueryNode,
        createGraphQLVariablesNode,
        createGraphQLSubscriptionEventsNode,
      } = await import('./nodes');

      // Create nodes with context components
      const GraphQLQueryNode = createGraphQLQueryNode(NodeViewWrapper, CodeEditor, RequestBlockHeader);
      const GraphQLVariablesNode = createGraphQLVariablesNode(NodeViewWrapper, CodeEditor, RequestBlockHeader);
      const GraphQLSubscriptionEventsNode = createGraphQLSubscriptionEventsNode(NodeViewWrapper, context, CodeEditor);

      // Register nodes
      context.registerVoidenExtension(GraphQLQueryNode);
      context.registerVoidenExtension(GraphQLVariablesNode);
      context.registerVoidenExtension(GraphQLSubscriptionEventsNode);

      // Register linkable node types
      context.registerLinkableNodeTypes([
        'gqlquery',
        'gqlvariables',
        'gqlsubscriptionevents',
      ]);

      // Register slash commands
      context.addVoidenSlashGroup({
        name: 'graphql',
        title: 'GraphQL',
        commands: [
          {
            name: 'graphql-query',
            label: 'GraphQL Query',
            aliases: ['gqlquery'],
            compareKeys: ['gqlquery'],
            singleton: true,
            slash: '/gqlquery',
            description: 'Insert GraphQL query block',
            action: (editor: any) => {
              if (!editor) return;
              editor
                .chain()
                .focus()
                .insertContent([
                  {
                    type: 'gqlquery',
                    attrs: {
                      body: '',
                      operationType: 'query',
                    },
                  },
                  {
                    type: 'paragraph',
                  },
                ])
                .run();
            },
          },
          {
            name: 'graphql-variables',
            label: 'GraphQL Variables',
            aliases: ['gqlvariables'],
            slash: '/gqlvariables',
            compareKeys: ['gqlvariables'],
            singleton: true,
            description: 'Insert GraphQL variables block',
            action: (editor: any) => {
              if (!editor) return;
              editor
                .chain()
                .focus()
                .insertContent([
                  {
                    type: 'gqlvariables',
                    attrs: {
                      body: '{}',
                    },
                  },
                  {
                    type: 'paragraph',
                  },
                ])
                .run();
            },
          },
        ],
      });

      // Register response processor for GraphQL subscriptions only
      context.onProcessResponse(async (response) => {
        // Only handle subscription responses, let queries/mutations use default REST response
        if (response.protocol !== 'graphql' || !response.operationType || response.operationType !== 'subscription') {
          return;
        }

        try {
          // Get subscriptionId directly from response (like wsId/grpcId pattern)
          const subscriptionId = response.subscriptionId || `sub-${Date.now()}`;

          const { convertSubscriptionResponseToVoidenDoc } = await import('./lib/subscriptionResponseConverter');
          
          const responseDoc = convertSubscriptionResponseToVoidenDoc({
            subscriptionId,
            url: response.requestMeta?.url || '',
            connected: false,
            requestMeta: response.requestMeta,
          });

          console.log('🚀 Opening GraphQL Subscription Tab:', {
            subscriptionId,
            url: response.requestMeta?.url,
            responseDoc: JSON.stringify(responseDoc, null, 2),
          });

          await context.openVoidenTab(
            `Subscription`,
            responseDoc,
          );
        } catch (error) {
          console.error('Failed to process GraphQL subscription response:', error);
        }
      });
    },

    metadata: manifest,
  };
}
