/**
 * Websocat Command Generator
 *
 * Utilities for converting WebSocket request blocks into websocat commands
 */

interface WebSocketRequestData {
  url?: string;
  headers?: Array<{ key: string; value: string }>;
  body?: string;
  auth?: {
    enabled: boolean;
    type: string;
    config: Record<string, string>;
  };
}

/**
 * Generate websocat command from WebSocket request data
 */
export const generateWebsocatCommand = (data: WebSocketRequestData): string => {
  const parts: string[] = ['websocat'];

  const url = data.url || '';
  if (!url) return '';

  // Add headers
  if (data.headers && data.headers.length > 0) {
    data.headers.forEach(({ key, value }) => {
      if (key.trim()) {
        parts.push(`-H "${key.trim()}: ${value?.trim() || ''}"`);
      }
    });
  }

  // Handle auth
  if (data.auth && data.auth.enabled) {
    const type = data.auth.type;
    const cfg = data.auth.config || {};

    if (type === 'bearer-token' && cfg.token) {
      parts.push(`-H "Authorization: ${cfg.headerPrefix || 'Bearer'} ${cfg.token}"`);
    } else if (type === 'basic-auth' && (cfg.username || cfg.password)) {
      const token = Buffer.from(`${cfg.username || ''}:${cfg.password || ''}`).toString('base64');
      parts.push(`-H "Authorization: Basic ${token}"`);
    } else if (type === 'api-key') {
      parts.push(`-H "${cfg.key || ''}: ${cfg.value || ''}"`);
    }
  }

  // Add URL
  parts.push(`"${url}"`);

  // Add body if present (will be sent as first message)
  if (data.body) {
    const escapedBody = data.body.replace(/"/g, '\\"');
    parts.push(`"${escapedBody}"`);
  }

  return parts.join(' ');
};

/**
 * Generate websocat command from request object (from getRequest)
 */
export const generateWebsocatFromRequestObject = (req: any): string => {
  if (!req || req.protocolType !== 'wss' && req.protocolType !== 'ws') {
    return '';
  }

  const data: WebSocketRequestData = {
    url: req.url || req.uri || '',
    headers: (req.headers || [])
      .filter((h: any) => h && h.key && (h.enabled === undefined || h.enabled))
      .map((h: any) => ({ key: h.key, value: h.value || '' })),
    auth: req.auth,
    body: req.body || '',
  };

  return generateWebsocatCommand(data);
};

/**
 * Generate websocat command from ProseMirror JSON content
 */
export const generateWebsocatFromJson = async (
  editor: any,
  activeDocKey: string,
  environment?: Record<string, string>
): Promise<string> => {
  // Dynamic import of getRequest function from app
  // @ts-ignore - Path resolved at runtime in app context
  const { getRequest } = await import(/* @vite-ignore */ '@/core/request-engine/getRequestFromJson');
  const requestData = await getRequest(editor, activeDocKey, environment);
  return generateWebsocatFromRequestObject(requestData);
};

/**
 * Copy websocat command to clipboard
 */
export const copyWebsocatToClipboard = async (
  editor: any,
  activeDocKey: string,
  environment?: Record<string, string>
): Promise<boolean> => {
  try {
    const wsCommand = await generateWebsocatFromJson(editor, activeDocKey, environment);

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(wsCommand);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = wsCommand;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy websocat command:', error);
    return false;
  }
};
