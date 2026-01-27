/**
 * Socket Command Converters (Advanced)
 *
 * Utilities for converting between websocat/grpcurl commands and request objects
 */

/**
 * Parse websocat command string and extract components
 */
export const parseWebsocatCommand = (command: string): {
  url?: string;
  headers: Array<{ key: string; value: string }>;
  body?: string;
  auth?: {
    type: string;
    value: string;
  };
} => {
  const headers: Array<{ key: string; value: string }> = [];
  let url = '';
  let body = '';
  let auth: { type: string; value: string } | undefined;

  // Remove 'websocat' prefix
  let remaining = command.replace(/^websocat\s+/, '').trim();

  // Parse headers and other options
  const headerRegex = /-H\s+"([^:]+):\s*([^"]+)"/g;
  let match;

  while ((match = headerRegex.exec(remaining)) !== null) {
    const [, key, value] = match;
    headers.push({ key, value });

    // Check for Authorization header to extract auth
    if (key.toLowerCase() === 'authorization') {
      if (value.startsWith('Bearer ')) {
        auth = { type: 'bearer', value: value.substring(7) };
      } else if (value.startsWith('Basic ')) {
        auth = { type: 'basic', value: value.substring(6) };
      }
    }
  }

  // Remove parsed headers from remaining string
  remaining = remaining.replace(headerRegex, '').trim();

  // Extract URL (usually quoted)
  const urlMatch = remaining.match(/"([^"]+)"/);
  if (urlMatch) {
    url = urlMatch[1];
    remaining = remaining.replace(`"${urlMatch[1]}"`, '').trim();
  } else {
    // Try unquoted URL at the start
    const parts = remaining.split(/\s+/);
    if (parts.length > 0) {
      url = parts[0];
      remaining = remaining.substring(url.length).trim();
    }
  }

  // Remaining quoted string is the body/message
  const bodyMatch = remaining.match(/"([^"]+)"/);
  if (bodyMatch) {
    body = bodyMatch[1].replace(/\\"/g, '"');
  }

  return {
    url,
    headers,
    body: body || undefined,
    auth,
  };
};

/**
 * Parse grpcurl command string and extract components
 */
export const parseGrpcurlCommand = (command: string): {
  address?: string;
  service?: string;
  method?: string;
  protoPath?: string;
  metadata: Array<{ key: string; value: string }>;
  body?: string;
  auth?: {
    type: string;
    value: string;
  };
} => {
  const metadata: Array<{ key: string; value: string }> = [];
  let address = '';
  let service = '';
  let method = '';
  let protoPath = '';
  let body = '';
  let auth: { type: string; value: string } | undefined;

  // Remove 'grpcurl' prefix
  let remaining = command.replace(/^grpcurl\s+/, '').trim();

  // Parse metadata (headers)
  const metadataRegex = /-H\s+"([^:]+):\s*([^"]+)"/g;
  let match;

  while ((match = metadataRegex.exec(remaining)) !== null) {
    const [, key, value] = match;
    metadata.push({ key, value });

    // Check for Authorization header
    if (key.toLowerCase() === 'authorization') {
      if (value.startsWith('Bearer ')) {
        auth = { type: 'bearer', value: value.substring(7) };
      } else if (value.startsWith('Basic ')) {
        auth = { type: 'basic', value: value.substring(6) };
      }
    }
  }

  remaining = remaining.replace(metadataRegex, '').trim();

  // Parse proto file path
  const protoMatch = remaining.match(/-proto\s+"([^"]+)"/);
  if (protoMatch) {
    protoPath = protoMatch[1];
    remaining = remaining.replace(protoMatch[0], '').trim();
  }

  // Parse request body
  const bodyMatch = remaining.match(/-d\s+'([^']+)'/);
  if (bodyMatch) {
    body = bodyMatch[1];
    remaining = remaining.replace(bodyMatch[0], '').trim();
  }

  // Parse address and method
  const parts = remaining.trim().split(/\s+/);
  if (parts.length >= 2) {
    address = parts[0];
    const methodParts = parts[1].split('/');
    if (methodParts.length === 2) {
      service = methodParts[0];
      method = methodParts[1];
    }
  }

  return {
    address,
    service,
    method,
    protoPath,
    metadata,
    body: body || undefined,
    auth,
  };
};

/**
 * Convert parsed websocat data to request object
 */
export const convertParsedWebsocatToRequest = (
  parsed: ReturnType<typeof parseWebsocatCommand>
) => {
  return {
    protocolType: parsed.url?.startsWith('wss://') ? 'wss' : 'ws',
    url: parsed.url,
    headers: parsed.headers,
    body: parsed.body,
    auth: parsed.auth
      ? {
        enabled: true,
        type: parsed.auth.type === 'bearer' ? 'bearer-token' : 'basic-auth',
        config:
          parsed.auth.type === 'bearer'
            ? { token: parsed.auth.value, headerPrefix: 'Bearer' }
            : { username: '', password: parsed.auth.value },
      }
      : undefined,
  };
};

/**
 * Convert parsed grpcurl data to request object
 */
export const convertParsedGrpcurlToRequest = (
  parsed: ReturnType<typeof parseGrpcurlCommand>
) => {
  return {
    protocolType: parsed.address?.includes(':443') ? 'grpcs' : 'grpc',
    url: parsed.address,
    grpc: {
      service: parsed.service,
      method: parsed.method,
      protoFilePath: parsed.protoPath,
      metadata: parsed.metadata.reduce(
        (acc, { key, value }) => {
          acc[key] = value;
          return acc;
        },
        {} as Record<string, string>
      ),
    },
    body: parsed.body,
    auth: parsed.auth
      ? {
        enabled: true,
        type: parsed.auth.type === 'bearer' ? 'bearer-token' : 'basic-auth',
        config:
          parsed.auth.type === 'bearer'
            ? { token: parsed.auth.value, headerPrefix: 'Bearer' }
            : { username: '', password: parsed.auth.value },
      }
      : undefined,
  };
};

/**
 * Full conversion: websocat command string -> request object
 */
export const websocatCommandToRequest = (command: string) => {
  const parsed = parseWebsocatCommand(command);
  return convertParsedWebsocatToRequest(parsed);
};

/**
 * Full conversion: grpcurl command string -> request object
 */
export const grpcurlCommandToRequest = (command: string) => {
  const parsed = parseGrpcurlCommand(command);
  return convertParsedGrpcurlToRequest(parsed);
};
