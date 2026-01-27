/**
 * GraphQL Subscription Response Converter
 * 
 * Converts subscription responses to Voiden document format
 */

export interface SubscriptionResponseData {
  subscriptionId: string;
  url?: string;
  connected: boolean;
  requestMeta?: any;
}

/**
 * Convert GraphQL subscription response to Voiden document with subscription events node
 */
export function convertSubscriptionResponseToVoidenDoc(data: SubscriptionResponseData) {
  return {
    type: 'doc',
    content: [
      {
        type: 'gqlsubscriptionevents',
        attrs: {
          subscriptionId: data.subscriptionId,
          url: data.url || null,
          connected: data.connected,
          events: [],
        },
      },
    ],
    attrs: {
      subscriptionId: data.subscriptionId,
      url: data.url,
      protocol: 'graphql-subscription',
      statusCode: 200,
      statusMessage: 'Subscription Active',
      elapsedTime: 0,
      requestMeta: data.requestMeta,
    },
  };
}

/**
 * Create a subscription event object
 */
export function createSubscriptionEvent(
  type: 'data' | 'error' | 'complete' | 'connection',
  payload?: any
) {
  return {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    type,
    ...(type === 'data' && payload && { data: payload }),
    ...(type === 'error' && payload && { error: payload }),
    ...(type === 'connection' && payload && { message: payload }),
    ...(type === 'complete' && { message: 'Subscription completed' }),
  };
}
