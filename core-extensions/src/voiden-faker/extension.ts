import { preSendFakerHook } from './lib/pipelineHook';

/**
 * Voiden Faker Extension
 * Generates fake data using Faker.js in API requests
 */
export class VoidenFakerExtension {
  name = 'voiden-faker';
  version = '1.0.0';
  description = 'Generate fake data using Faker.js in your requests';
  author = 'Voiden Team';
  icon = '🎲';

  private context?: any;

  _setContext(context: any) {
    this.context = context;
  }

  async onLoad() {
    if (!this.context) {
      return;
    }


    // Register Pre-Send hook (Stage 5)
    // Priority 10 ensures it runs after most other hooks but before sending
    if (this.context.pipeline?.registerHook) {
      this.context.pipeline.registerHook(
        'pre-send',
        preSendFakerHook,
        10  // Priority
      );
    }

  }

  async onUnload() {
  }
}
