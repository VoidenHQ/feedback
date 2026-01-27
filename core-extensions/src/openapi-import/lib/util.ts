
import { OpenAPIValidation, OpenAPIValidationResult, ValidationError, ValidationWarning } from "./pipelineHook";

export const insertOpenAPIValidation = (editor: any, specUrl?: string) => {
  const { from, to } = editor.state.selection;

  editor
    .chain()
    .focus()
    .deleteRange({ from, to })
    .insertContent({
      type: 'openapi-validation',
      attrs: {
        specUrl: specUrl || '',
        enabled: true,
        method: '',
        path: '',
      },
    })
    .run();
};

/**
 * Update OpenAPI validation config
 */
export const updateOpenAPIValidationConfig = (
  editor: any,
  config: Partial<OpenAPIValidation>
) => {
  // Find the openapi-validation node and update its attributes
  const { state } = editor;
  const { doc } = state;
  
  let validationPos: number | null = null;
  
  doc.descendants((node: any, pos: number) => {
    if (node.type.name === 'openapi-validation') {
      validationPos = pos;
      return false;
    }
  });
  
  if (validationPos !== null) {
    editor.commands.updateAttributes('openapi-validation', config);
  }
};

/**
 * Parse OpenAPI spec from file or URL
 */
export const parseOpenAPISpec = async (source: string | File): Promise<any> => {
  try {
    if (typeof source === 'string') {
      // URL
      const response = await fetch(source);
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('yaml') || contentType?.includes('yml')) {
        const text = await response.text();
        // You'd need to add a YAML parser library for this
        console.warn('YAML parsing not implemented, please provide JSON');
        return null;
      }
      
      return await response.json();
    } else {
      // File
      const text = await source.text();
      
      if (source.name.endsWith('.yaml') || source.name.endsWith('.yml')) {
        console.warn('YAML parsing not implemented, please provide JSON');
        return null;
      }
      
      return JSON.parse(text);
    }
  } catch (error) {
    console.error('Failed to parse OpenAPI spec:', error);
    return null;
  }
};

/**
 * Get validation error summary
 */
export const getValidationSummary = (result: OpenAPIValidationResult): string => {
  if (result.passed) {
    return `✓ All validations passed (${result.warnings.length} warnings)`;
  }
  
  return `✗ ${result.errors.length} error(s), ${result.warnings.length} warning(s)`;
};

/**
 * Get validation examples for documentation
 */
export const getOpenAPIValidationExamples = () => {
  return [
    {
      title: 'Basic Validation',
      description: 'Validate against a public OpenAPI spec',
      config: {
        specUrl: 'https://api.example.com/openapi.json',
        enabled: true,
      },
    },
    {
      title: 'Specific Operation',
      description: 'Validate against a specific operation',
      config: {
        specUrl: 'https://api.example.com/openapi.json',
        operationId: 'getUserById',
        enabled: true,
      },
    },
    {
      title: 'Path and Method',
      description: 'Validate using path and method',
      config: {
        specUrl: 'https://api.example.com/openapi.json',
        path: '/users/{id}',
        method: 'GET',
        enabled: true,
      },
    },
  ];
};

/**
 * Format validation error for display
 */
export const formatValidationError = (error: ValidationError): string => {
  let message = error.message;
  
  if (error.path) {
    message += ` at path: ${error.path}`;
  }
  
  if (error.expected !== undefined && error.actual !== undefined) {
    message += ` (expected: ${JSON.stringify(error.expected)}, got: ${JSON.stringify(error.actual)})`;
  }
  
  return message;
};

/**
 * Format validation warning for display
 */
export const formatValidationWarning = (warning: ValidationWarning): string => {
  let message = warning.message;
  
  if (warning.path) {
    message += ` at path: ${warning.path}`;
  }
  
  return message;
};

/**
 * Group errors by type
 */
export const groupErrorsByType = (errors: ValidationError[]): Record<string, ValidationError[]> => {
  const grouped: Record<string, ValidationError[]> = {
    schema: [],
    status: [],
    header: [],
    'content-type': [],
  };
  
  errors.forEach(error => {
    if (grouped[error.type]) {
      grouped[error.type].push(error);
    }
  });
  
  return grouped;
};

/**
 * Check if validation is configured in document
 */
export const hasOpenAPIValidation = (doc: any): boolean => {
  if (!doc || !doc.content) {
    return false;
  }
  
  let hasValidation = false;
  
  function traverse(node: any) {
    if (node.type === 'openapi-validation') {
      hasValidation = true;
      return;
    }
    
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach((child: any) => traverse(child));
    }
  }
  
  traverse(doc);
  return hasValidation;
};

/**
 * Extract all operations from OpenAPI spec
 */
export const extractOperations = (spec: any): Array<{
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
}> => {
  const operations: Array<{
    path: string;
    method: string;
    operationId?: string;
    summary?: string;
  }> = [];
  
  if (!spec || !spec.paths) {
    return operations;
  }
  
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
    
    for (const method of methods) {
      if ((pathItem as any)[method]) {
        operations.push({
          path,
          method: method.toUpperCase(),
          operationId: (pathItem as any)[method].operationId,
          summary: (pathItem as any)[method].summary,
        });
      }
    }
  }
  
  return operations;
};

/**
 * Get supported validation types
 */
export const getSupportedValidationTypes = () => {
  return [
    {
      type: 'status',
      description: 'Validates HTTP status code against spec',
      example: 'Checks if 200, 201, 4XX, etc. are defined',
    },
    {
      type: 'content-type',
      description: 'Validates response Content-Type header',
      example: 'Checks if application/json is defined',
    },
    {
      type: 'schema',
      description: 'Validates response body against JSON Schema',
      example: 'Checks types, required fields, nested objects',
    },
    {
      type: 'header',
      description: 'Validates response headers',
      example: 'Checks required headers like Authorization',
    },
  ];
};