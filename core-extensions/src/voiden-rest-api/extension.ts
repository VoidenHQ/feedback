/**
 * Voiden REST API Extension
 *
 * Provides HTTP/REST API testing capabilities including:
 * - Request blocks (method, URL, headers, query params, body)
 * - Request pipeline integration
 * - Response visualization
 * - Slash commands for quick request creation
 */

import { UIExtension, PipelineStage, RequestCompilationContext } from '@voiden/sdk';
import { restApiSlashGroup } from './lib/slashCommands';

export class VoidenRestApiExtension extends UIExtension {
  // ========================================
  // Extension Metadata
  // ========================================

  name = 'voiden-rest-api';
  version = '1.0.0';
  description = 'HTTP/REST API testing with request pipeline, blocks, and response handling';
  author = 'Voiden Team';
  icon = 'Globe';

  // ========================================
  // Lifecycle Hooks
  // ========================================

  async onLoad(): Promise<void> {

    // Register slash commands
    this.setupSlashCommands();

    // Register pipeline hooks
    this.setupPipelineHooks();

    // TODO: Register blocks (nodes)
    // - Method selector (GET, POST, PUT, DELETE, etc.)
    // - URL input
    // - Headers table
    // - Query params table
    // - Body editor (JSON, form-data, etc.)

    // TODO: Register UI components
    // - Response panel
    // - Request history sidebar

  }

  async onUnload(): Promise<void> {
    // Cleanup will be handled automatically by the platform
  }

  // ========================================
  // Private Methods (to be implemented)
  // ========================================

  /**
   * Register custom blocks/nodes for REST API
   */
  private setupBlocks(): void {
    // TODO: Implement block registration
  }

  /**
   * Register slash commands for quick request creation
   */
  private setupSlashCommands(): void {
    this.registerSlashGroup(restApiSlashGroup);
  }

  /**
   * Register pipeline hooks for request handling
   */
  private setupPipelineHooks(): void {
    // Register Request Compilation hook to set Content-Type based on body nodes
    this.registerPipelineHook<RequestCompilationContext>(
      PipelineStage.RequestCompilation,
      async (context) => {
        const { editor, addHeader } = context;
        const json = editor.getJSON();

        if (!json.content) return;

        // Check for JSON body node
        const jsonBodyNode = json.content.find((node: any) => node.type === 'json_body');
        if (jsonBodyNode) {
          // Only add Content-Type if not already present in headers
          const hasContentType = context.requestState.headers.some(
            h => h.key.toLowerCase() === 'content-type'
          );
          if (!hasContentType) {
            addHeader('Content-Type', 'application/json');
          }
          return;
        }

        // Check for XML body node
        const xmlBodyNode = json.content.find((node: any) => node.type === 'xml_body');
        if (xmlBodyNode) {
          const hasContentType = context.requestState.headers.some(
            h => h.key.toLowerCase() === 'content-type'
          );
          if (!hasContentType) {
            addHeader('Content-Type', 'application/xml');
          }
          return;
        }

        // Check for YAML body node
        const ymlBodyNode = json.content.find((node: any) => node.type === 'yml_body');
        if (ymlBodyNode) {
          const hasContentType = context.requestState.headers.some(
            h => h.key.toLowerCase() === 'content-type'
          );
          if (!hasContentType) {
            addHeader('Content-Type', 'application/x-yaml');
          }
          return;
        }

        // Check for multipart form data
        const hasMultipartTable = json.content.some((node: any) => node.type === 'multipart-table');
        if (hasMultipartTable) {
          // Note: multipart/form-data Content-Type is handled specially by the platform
          // (it needs to include boundary parameter which is auto-generated)
          // So we don't add it here
          return;
        }

        // Check for URL-encoded form data
        const hasUrlTable = json.content.some((node: any) => node.type === 'url-table');
        if (hasUrlTable) {
          const hasContentType = context.requestState.headers.some(
            h => h.key.toLowerCase() === 'content-type'
          );
          if (!hasContentType) {
            addHeader('Content-Type', 'application/x-www-form-urlencoded');
          }
          return;
        }
      }
    );
  }

  /**
   * Register UI panels and sidebars
   */
  private setupUI(): void {
    // TODO: Implement UI registration
  }
}
