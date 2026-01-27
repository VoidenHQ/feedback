/**
 * Hook Registry
 *
 * Manages extension hooks for the request execution pipeline.
 * Extensions register hooks to customize behavior at different pipeline stages.
 */

import { Hook, HookHandler, PipelineStage } from './types';

/**
 * Singleton registry for managing pipeline hooks
 */
export class HookRegistry {
  private static instance: HookRegistry;
  private hooks: Map<PipelineStage, Hook[]> = new Map();

  private constructor() {
    // Initialize empty arrays for each stage
    Object.values(PipelineStage).forEach(stage => {
      this.hooks.set(stage, []);
    });
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): HookRegistry {
    if (!HookRegistry.instance) {
      HookRegistry.instance = new HookRegistry();
    }
    return HookRegistry.instance;
  }

  /**
   * Register a hook for a specific pipeline stage
   */
  public registerHook(
    extensionId: string,
    stage: PipelineStage,
    handler: HookHandler,
    priority: number = 100
  ): void {
    const hook: Hook = {
      extensionId,
      stage,
      handler,
      priority,
    };

    const stageHooks = this.hooks.get(stage) || [];
    stageHooks.push(hook);

    // Sort by priority (lower numbers run first)
    stageHooks.sort((a, b) => (a.priority || 100) - (b.priority || 100));

    this.hooks.set(stage, stageHooks);
  }

  /**
   * Unregister all hooks for an extension
   */
  public unregisterExtension(extensionId: string): void {
    this.hooks.forEach((hooks, stage) => {
      const filtered = hooks.filter(h => h.extensionId !== extensionId);
      this.hooks.set(stage, filtered);
    });
  }

  /**
   * Get all hooks for a specific stage
   */
  public getHooks(stage: PipelineStage): Hook[] {
    return this.hooks.get(stage) || [];
  }

  /**
   * Execute all hooks for a specific stage
   */
  public async executeHooks<T>(stage: PipelineStage, context: T): Promise<void> {
    const stageHooks = this.getHooks(stage);

    if (stageHooks.length === 0) {
      return;
    }

    for (const hook of stageHooks) {
      try {
        await hook.handler(context);
      } catch (error) {
        // console.error(`[HookRegistry] Error in hook ${hook.extensionId} at stage ${stage}:`, error);
        // Continue executing other hooks even if one fails
      }
    }
  }

  /**
   * Clear all hooks (useful for testing)
   */
  public clearAll(): void {
    this.hooks.forEach((_, stage) => {
      this.hooks.set(stage, []);
    });
  }

  /**
   * Get statistics about registered hooks
   */
  public getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.hooks.forEach((hooks, stage) => {
      stats[stage] = hooks.length;
    });
    return stats;
  }
}

// Export singleton instance
export const hookRegistry = HookRegistry.getInstance();
