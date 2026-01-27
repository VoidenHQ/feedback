/**
 * Request Orchestrator
 *
 * Core system for orchestrating HTTP request execution through plugin pipeline
 * Manages plugin hooks for request building and response processing
 */

import { Editor } from "@tiptap/core";
import { sendRequestHybrid } from "./sendRequestHybrid";
import type { RequestBuildHandler, ResponseProcessHandler, ResponseSection } from "@voiden/sdk/ui";
import { requestLogger } from "@/core/lib/logger";

interface RequestOrchestrator {
  /** Registered request build handlers from plugins */
  requestHandlers: RequestBuildHandler[];

  /** Registered response process handlers from plugins */
  responseHandlers: ResponseProcessHandler[];

  /** Registered response sections from plugins */
  responseSections: ResponseSection[];

  /** Register a request build handler */
  registerRequestHandler: (handler: RequestBuildHandler) => void;

  /** Register a response process handler */
  registerResponseHandler: (handler: ResponseProcessHandler) => void;

  /** Register a response section */
  registerResponseSection: (section: ResponseSection) => void;

  /** Execute the full request pipeline */
  executeRequest: (editor: Editor, environment?: Record<string, string>, signal?: AbortSignal) => Promise<any>;

  /** Clear all registered handlers */
  clear: () => void;
}

class RequestOrchestratorImpl implements RequestOrchestrator {
  requestHandlers: RequestBuildHandler[] = [];
  responseHandlers: ResponseProcessHandler[] = [];
  responseSections: ResponseSection[] = [];

  registerRequestHandler(handler: RequestBuildHandler) {
    requestLogger.info("Plugin registered request handler");
    this.requestHandlers.push(handler);
  }

  registerResponseHandler(handler: ResponseProcessHandler) {
    requestLogger.info("Plugin registered response handler");
    this.responseHandlers.push(handler);
  }

  registerResponseSection(section: ResponseSection) {
    requestLogger.info("Plugin registered response section:", section.name);
    this.responseSections.push(section);
  }

  async executeRequest(editor: Editor, environment?: Record<string, string>, signal?: AbortSignal): Promise<any> {
    requestLogger.info("Starting request execution");

    // Step 1: Build request through plugin chain
    requestLogger.info(`Building request through ${this.requestHandlers.length} plugin handler(s)`);
    let request: any = {};

    for (const handler of this.requestHandlers) {
      try {
        request = await handler(request, editor);
      } catch (error) {
        requestLogger.error("Error in plugin request handler:", error);
        throw error;
      }
    }

    // Step 2: Send request through core pipeline
    const response = await sendRequestHybrid(request, editor, signal, window.electron);

    if (!response) {
      throw new Error("No response received from request pipeline");
    }

    // Step 3: Process response through plugin chain
    requestLogger.info(`Processing response through ${this.responseHandlers.length} plugin handler(s)`);
    for (const handler of this.responseHandlers) {
      try {
        await handler(response);
      } catch (error) {
        requestLogger.error("Error in plugin response handler:", error);
        // Don't throw - let other handlers execute
      }
    }

    requestLogger.info("Request execution complete");
    return response;
  }

  clear() {
    requestLogger.info("Clearing all plugin handlers");
    this.requestHandlers = [];
    this.responseHandlers = [];
    this.responseSections = [];
  }

  /** Get all registered response sections sorted by order */
  getResponseSections(): ResponseSection[] {
    return [...this.responseSections].sort((a, b) => (a.order || 0) - (b.order || 0));
  }
}

// Global singleton instance
export const requestOrchestrator = new RequestOrchestratorImpl();
