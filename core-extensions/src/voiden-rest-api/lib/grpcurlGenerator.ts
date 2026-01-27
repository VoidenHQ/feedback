/**
 * grpcurl Command Generator
 *
 * Utilities for converting gRPC request blocks into grpcurl commands
 */

interface GrpcRequestData {
  url?: string;
  body?: string;
  metadata?: Record<string, string>;
  grpc?: {
    protoFile?: string;
    protoFilePath?: string;
    package?: string;
    service?: string;
    method?: string;
    callType?: string;
    requestType?: string;
    responseType?: string;
  };
  auth?: {
    enabled: boolean;
    type: string;
    config: Record<string, string>;
  };
}

/**
 * Generate grpcurl command from gRPC request data
 */
export const generateGrpcurlCommand = (data: GrpcRequestData): string => {
  const parts: string[] = ['grpcurl'];

  const url = data.url || '';
  if (!url || !data.grpc?.service || !data.grpc?.method) {
    return '';
  }

  // Add metadata (gRPC headers)
  if (data.metadata && Object.keys(data.metadata).length > 0) {
    Object.entries(data.metadata).forEach(([key, value]) => {
      if (key && value) {
        parts.push(`-H "${key}: ${value}"`);
      }
    });
  }

  // Handle auth
  if (data.auth && data.auth.enabled) {
    const type = data.auth.type;
    const cfg = data.auth.config || {};

    if (type === 'bearer-token' && cfg.token) {
      parts.push(`-H "authorization: ${cfg.headerPrefix || 'Bearer'} ${cfg.token}"`);
    } else if (type === 'basic-auth' && (cfg.username || cfg.password)) {
      const token = Buffer.from(`${cfg.username || ''}:${cfg.password || ''}`).toString('base64');
      parts.push(`-H "authorization: Basic ${token}"`);
    } else if (type === 'api-key') {
      parts.push(`-H "${cfg.key || ''}: ${cfg.value || ''}"`);
    }
  }

  // Add proto file path if available
  if (data.grpc?.protoFilePath) {
    parts.push(`-proto "${data.grpc.protoFilePath}"`);
  }

  // Add request body (JSON for gRPC)
  if (data.body) {
    const escapedBody = data.body.replace(/"/g, '\\"').replace(/\n/g, ' ');
    parts.push(`-d '${escapedBody}'`);
  } else {
    // Empty request for unary calls with no data
    parts.push(`-d '{}'`);
  }

  // Add service and method
  const fullMethod = data.grpc?.package
    ? `${data.grpc.package}.${data.grpc.service}/${data.grpc.method}`
    : `${data.grpc?.service}/${data.grpc?.method}`;

  // Add server address
  parts.push(`${url}`);

  // Add full method name
  parts.push(fullMethod);

  return parts.join(' ');
};

/**
 * Generate grpcurl command from request object (from getRequest)
 */
export const generateGrpcurlFromRequestObject = (req: any): string => {
  if (!req || (req.protocolType !== 'grpc' && req.protocolType !== 'grpcs')) {
    return '';
  }

  const data: GrpcRequestData = {
    url: req.url || req.uri || '',
    body: req.body || req.grpc?.payload || '',
    metadata: req.grpc?.metadata || {},
    grpc: req.grpc,
    auth: req.auth,
  };

  return generateGrpcurlCommand(data);
};

/**
 * Generate grpcurl command from ProseMirror JSON content
 */
export const generateGrpcurlFromJson = async (
  editor: any,
  activeDocKey: string,
  environment?: Record<string, string>
): Promise<string> => {
  // Dynamic import of getRequest function from app
  // @ts-ignore - Path resolved at runtime in app context
  const { getRequest } = await import(/* @vite-ignore */ '@/core/request-engine/getRequestFromJson');
  const requestData = await getRequest(editor, activeDocKey, environment);
  return generateGrpcurlFromRequestObject(requestData);
};

/**
 * Copy grpcurl command to clipboard
 */
export const copyGrpcurlToClipboard = async (
  editor: any,
  activeDocKey: string,
  environment?: Record<string, string>
): Promise<boolean> => {
  try {
    const grpcCommand = await generateGrpcurlFromJson(editor, activeDocKey, environment);

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(grpcCommand);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = grpcCommand;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy grpcurl command:', error);
    return false;
  }
};
