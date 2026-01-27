/**
 * Voiden Advanced Authentication Extension
 *
 * Provides advanced authentication support including:
 * - Bearer Token
 * - Basic Auth
 * - API Key (Header/Query)
 * - OAuth 1.0
 * - OAuth 2.0
 * - Digest Auth
 * - AWS Signature
 * - And more...
 */

import type { PluginContext } from '@voiden/sdk/ui';
import { insertAuthNode } from './lib/utils';

export default function createAdvancedAuthPlugin(context: PluginContext) {
  return {
    onload: async () => {

      // Load AuthNode from plugin package
      const { createAuthNode } = await import('./nodes/AuthNode');

      // Create node with context components
      const { NodeViewWrapper, RequestBlockHeader } = context.ui.components;
      const AuthNode = createAuthNode(NodeViewWrapper, RequestBlockHeader, context.project.openFile);

      // Register AuthNode
      context.registerVoidenExtension(AuthNode);

      // Register linkable node type
      context.registerLinkableNodeTypes(['auth']);

      // Register display names for node types
      context.registerNodeDisplayNames({
        'auth': 'Authorization',
      });

      // Register slash commands for different auth types
      context.addVoidenSlashGroup({
        name: 'advanced-auth',
        title: 'Advanced Authentication',
        commands: [
          {
            name: "auth",
            singleton: true,
            label: "Authorization",
            compareKeys: ["auth","auth-api-key", "auth-basic", "auth-bearer", "auth-api-key", "auth-oauth1", "auth-oauth2", "auth-digest", "auth-aws"],
            aliases: ['auth'],
            slash: "/auth",
            description: "Insert authorization block",
            action: (editor: any) => {
              insertAuthNode(editor, "inherit");
            },
          },
          {
            name: "auth-bearer",
            label: "Bearer Token",
            singleton: true,
            compareKeys: ["auth","auth-api-key", "auth-basic", "auth-bearer", "auth-api-key", "auth-oauth1", "auth-oauth2", "auth-digest", "auth-aws"],
            aliases: ['auth-bearer'],
            slash: "/auth-bearer",
            description: "Insert Bearer Token auth",
            action: (editor: any) => {
              insertAuthNode(editor, "bearer");
            },
          },
          {
            name: "auth-basic",
            label: "Basic Auth",
            singleton: true,
            compareKeys: ["auth","auth-api-key", "auth-basic", "auth-bearer", "auth-api-key", "auth-oauth1", "auth-oauth2", "auth-digest", "auth-aws"],
            aliases: ["auth-basic"],
            slash: "/auth-basic",
            description: "Insert Basic authentication",
            action: (editor: any) => {
              insertAuthNode(editor, "basic");
            },
          },
          {
            name: "auth-api-key",
            label: "API Key",
            singleton: true,
            compareKeys: ["auth", "auth-api-key","auth-basic", "auth-bearer", "auth-api-key", "auth-oauth1", "auth-oauth2", "auth-digest", "auth-aws"],
            aliases: ["auth-api-key"],
            slash: "/auth-api-key",
            description: "Insert API Key auth",
            action: (editor: any) => {
              insertAuthNode(editor, "apiKey");
            },
          },
          {
            name: "auth-oauth2",
            label: "OAuth 2.0",
            singleton: true,
            compareKeys: ["auth", "auth-api-key", "auth-basic", "auth-bearer", "auth-api-key", "auth-oauth1", "auth-oauth2", "auth-digest", "auth-aws"],
            aliases: ["auth-oauth2"],
            slash: "/auth-oauth2",
            description: "Insert OAuth 2.0 auth",
            action: (editor: any) => {
              insertAuthNode(editor, "oauth2");
            },
          },
          {
            name: "auth-oauth1",
            label: "OAuth 1.0",
            singleton: true,
            compareKeys: ["auth", "auth-api-key","auth-basic", "auth-bearer", "auth-api-key", "auth-oauth1", "auth-oauth2", "auth-digest", "auth-aws"],
            aliases: ["auth-oauth1"],
            slash: "/auth-oauth1",
            description: "Insert OAuth 1.0 auth",
            action: (editor: any) => {
              insertAuthNode(editor, "oauth1");
            },
          },
          {
            name: "auth-digest",
            label: "Digest Auth",
            singleton: true,
            compareKeys: ["auth", "auth-api-key","auth-basic", "auth-bearer", "auth-api-key", "auth-oauth1", "auth-oauth2", "auth-digest", "auth-aws"],
            aliases: ["auth-digest"],
            slash: "/auth-digest",
            description: "Insert Digest authentication",
            action: (editor: any) => {
              insertAuthNode(editor, "digest");
            },
          },
          {
            name: "auth-aws",
            label: "AWS Signature",
            singleton: true,
            compareKeys: ["auth", "auth-api-key","auth-basic", "auth-bearer", "auth-api-key", "auth-oauth1", "auth-oauth2", "auth-digest", "auth-aws"],
            aliases: ["auth-aws"],
            slash: "/auth-aws",
            description: "Insert AWS Signature auth",
            action: (editor: any) => {
              insertAuthNode(editor, "awsSignature");
            },
          },
        ],
      });
    },

    onunload: async () => {
    },
  };
}
