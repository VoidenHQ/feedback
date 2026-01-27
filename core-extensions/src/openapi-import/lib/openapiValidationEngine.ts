import { ExtendedPluginContextExplicit } from '../plugin';
import type {
  OpenAPIValidation,
  OpenAPIValidationResult,
  OpenAPIValidationContext,
  ValidationError,
  ValidationWarning,
} from './pipelineHook';
import { load } from 'js-yaml';

function normalizeValidatedAgainst(data: any): { path: string; method: string; operationId?: string } {
  if (!data || typeof data !== 'object') {
    return {
      path: '/',
      method: 'GET',
      operationId: undefined,
    };
  }

  // If it's already in the correct format
  if ('path' in data && 'method' in data) {
    return {
      path: String(data.path || '/'),
      method: String(data.method || 'GET'),
      operationId: data.operationId,
    };
  }

  // If it's in the old {key, value, enabled} format
  if ('key' in data || 'value' in data) {
    console.warn('[OpenAPI Validation] Converting old format {key, value, enabled} to {path, method}', data);
    return {
      path: String(data.value || '/'),
      method: String(data.key || 'GET'),
      operationId: data.operationId,
    };
  }

  // Fallback
  return {
    path: '/',
    method: 'GET',
    operationId: undefined,
  };
}

export async function validateOpenAPI(
  validation: OpenAPIValidation,
  context: OpenAPIValidationContext,
  pluginContext: ExtendedPluginContextExplicit
): Promise<OpenAPIValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    // Load OpenAPI spec
    const spec = await loadOpenAPISpec(validation, pluginContext);
    if (!spec) {
      errors.push({
        type: 'schema',
        message: 'Failed to load OpenAPI specification',
      });
      return {
        passed: false,
        errors,
        warnings,
        validatedAgainst: normalizeValidatedAgainst({
          path: '',
          method: '',
        }),
      };
    }

    console.log('[OpenAPI Validation] Loaded spec successfully');

    // Get base path from spec for proper path normalization
    const basePath = getBasePath(spec);

    // Find matching operation in the spec
    const operation = findOperation(spec, context);

    if (!operation) {
      errors.push({
        type: 'schema',
        message: `No matching operation found for ${context.request.method} ${context.request.path}`,
      });
      return {
        passed: false,
        errors,
        warnings,
        validatedAgainst: normalizeValidatedAgainst({
          path: context.request.path,
          method: context.request.method,
        }),
      };
    }

    console.log('[OpenAPI Validation] Found operation:', operation.path, operation.method);

    // VALIDATE REQUEST
    validateRequestParameters(operation, context.request, spec, basePath, errors, warnings);
    validateRequestBody(operation, context.request, spec, errors, warnings);

    // VALIDATE RESPONSE
    validateStatusCode(operation, context.response.status, errors);
    validateContentType(operation, context.response, errors, warnings);
    validateResponseSchema(operation, context.response, spec, errors, warnings);
    validateResponseHeaders(operation, context.response, spec, errors, warnings);

    console.log('[OpenAPI Validation] Validation complete:', {
      passed: errors.length === 0,
      errors: errors.length,
      warnings: warnings.length,
    });

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      validatedAgainst: {
        path: operation.path,
        method: operation.method,
        operationId: operation.operationId,
      },
    };
  } catch (error: any) {
    console.error('[OpenAPI Validation] Validation error:', error);
    errors.push({
      type: 'schema',
      message: `Validation error: ${error.message || String(error)}`,
    });
    return {
      passed: false,
      errors,
      warnings,
      validatedAgainst: {
        path: '',
        method: '',
      },
    };
  }
}

/**
 * Load OpenAPI specification from file
 */
async function loadOpenAPISpec(validation: OpenAPIValidation, pluginContext: ExtendedPluginContextExplicit): Promise<any> {
  if (!validation.specFilePath) {
    console.error('[OpenAPI Validation] No spec file path provided');
    return null;
  }

  try {
    console.log('[OpenAPI Validation] Loading spec from:', validation.specFilePath);

    const content = await pluginContext.files?.read(validation.specFilePath);

    if (!content) {
      console.error('[OpenAPI Validation] File content is empty');
      return null;
    }

    const isYaml = validation.specFilename?.endsWith('.yaml') ||
      validation.specFilename?.endsWith('.yml');

    console.log('[OpenAPI Validation] File type:', isYaml ? 'YAML' : 'JSON');

    if (isYaml) {
      return parseYAML(content as string);
    } else {
      return JSON.parse(content as string);
    }
  } catch (error) {
    console.error('[OpenAPI Validation] Failed to load spec from file:', error);
    return null;
  }
}

/**
 * Parse YAML content to JSON
 */
export function parseYAML(yamlContent: string): any {
  try {
    return load(yamlContent);
  } catch (error) {
    console.error("[OpenAPI Validation] Failed to parse YAML:", error);

    try {
      return JSON.parse(yamlContent);
    } catch {
      throw new Error(
        "Unable to parse content. Provide valid YAML or JSON. js-yaml failed, and JSON fallback also failed."
      );
    }
  }
}


/**
 * Extract the base path from OpenAPI servers
 */
function getBasePath(spec: any): string {
  if (!spec.servers || !Array.isArray(spec.servers) || spec.servers.length === 0) {
    return '';
  }

  try {
    const serverUrl = spec.servers[0].url;
    const url = new URL(serverUrl);
    // Return the pathname from the server URL (e.g., "/api" from "http://localhost:3000/api")
    return url.pathname === '/' ? '' : url.pathname;
  } catch (e) {
    // If URL parsing fails, try to extract path-only base
    const serverUrl = spec.servers[0].url;
    if (serverUrl.startsWith('/')) {
      return serverUrl;
    }
    return '';
  }
}

/**
 * Normalize a request path by removing the base path
 */
function normalizePath(fullPath: string, basePath: string): string {
  if (!basePath || basePath === '/') {
    return fullPath;
  }

  // Remove base path from the beginning
  if (fullPath.startsWith(basePath)) {
    const normalized = fullPath.substring(basePath.length);
    // Ensure it starts with /
    return normalized.startsWith('/') ? normalized : '/' + normalized;
  }

  return fullPath;
}

/**
 * Find matching operation in OpenAPI spec
 * NOW PROPERLY HANDLES BASE PATHS FROM SERVER URLs
 */
function findOperation(spec: any, context: OpenAPIValidationContext): any {
  const paths = spec.paths || {};
  const method = context.request.method.toLowerCase();
  
  let targetPath = context.request.path;
  
  try {
    const url = new URL(context.request.url);
    targetPath = url.pathname;
  } catch (e) {
    if (targetPath.includes('?')) {
      targetPath = targetPath.split('?')[0];
    }
  }

  const basePath = getBasePath(spec);
  const normalizedPath = normalizePath(targetPath, basePath);

  // Try exact path match first
  if (paths[normalizedPath]) {
    const pathItem = paths[normalizedPath];
    if (pathItem[method]) {
      console.log('[OpenAPI Validation] Exact match found:', normalizedPath);
      return {
        path: normalizedPath,
        method: method.toUpperCase(),
        operationId: pathItem[method].operationId,
        spec: pathItem[method],
      };
    }
  }

  for (const [specPath, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    
    if ((pathItem as any)[method]) {
      const pathPattern = specPath.replace(/{[^}]+}/g, '[^/]+');
      const regex = new RegExp(`^${pathPattern}$`);
      
      if (regex.test(normalizedPath)) {
        console.log('[OpenAPI Validation] Pattern matched:', specPath);
        return {
          path: specPath,
          method: method.toUpperCase(),
          operationId: (pathItem as any)[method].operationId,
          spec: (pathItem as any)[method],
        };
      }
    }
  }

  console.warn('[OpenAPI Validation] No matching operation found');
  console.warn('[OpenAPI Validation] Available paths:', Object.keys(paths));
  return null;
}
/**
 * Resolve schema references ($ref)
 */
function resolveSchema(schema: any, spec: any): any {
  if (!schema || !schema.$ref) {
    return schema;
  }

  const ref = schema.$ref;

  if (ref.startsWith('#/')) {
    const parts = ref.substring(2).split('/');
    let resolved = spec;

    for (const part of parts) {
      if (resolved && typeof resolved === 'object') {
        resolved = resolved[part];
      } else {
        console.warn('[OpenAPI Validation] Failed to resolve $ref:', ref);
        return schema;
      }
    }

    return resolved || schema;
  }

  return schema;
}

/**
 * UNIFIED VALIDATION FUNCTION - Works for all data types
 * This validates ANY value against ANY schema with ALL validations applied
 */
function validateUnified(
  schema: any,
  data: any,
  path: string,
  spec: any,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Resolve $ref if present
  if (schema && schema.$ref) {
    schema = resolveSchema(schema, spec);
  }

  if (!schema) {
    return;
  }

  // Handle nullable - null is explicitly allowed
  if (data === null) {
    if (schema.nullable === true) {
      return; // null is allowed
    } else {
      errors.push({
        type: 'schema',
        message: `Value is null but schema does not allow nullable at ${path}`,
        path,
        expected: 'non-null value',
        actual: null,
      });
      return;
    }
  }

  // Handle undefined
  if (data === undefined) {
    return; // handled by required validation
  }

  // Handle oneOf - exactly one schema must match
  if (schema.oneOf && Array.isArray(schema.oneOf)) {
    let matchCount = 0;

    for (const subSchema of schema.oneOf) {
      const tempErrors: ValidationError[] = [];
      const tempWarnings: ValidationWarning[] = [];
      validateUnified(subSchema, data, path, spec, tempErrors, tempWarnings);

      if (tempErrors.length === 0) {
        matchCount++;
      }
    }

    if (matchCount !== 1) {
      errors.push({
        type: 'schema',
        message: `oneOf validation failed at ${path}: matched ${matchCount} schemas (expected exactly 1)`,
        path,
        expected: 'exactly one schema match',
        actual: `${matchCount} matches`,
      });
    }
    return;
  }

  // Handle anyOf - at least one schema must match
  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    let matchCount = 0;

    for (const subSchema of schema.anyOf) {
      const tempErrors: ValidationError[] = [];
      const tempWarnings: ValidationWarning[] = [];
      validateUnified(subSchema, data, path, spec, tempErrors, tempWarnings);

      if (tempErrors.length === 0) {
        matchCount++;
      }
    }

    if (matchCount === 0) {
      errors.push({
        type: 'schema',
        message: `anyOf validation failed at ${path}: no schemas matched`,
        path,
        expected: 'at least one schema match',
        actual: 'no matches',
      });
    }
    return;
  }

  // Handle allOf - all schemas must match
  if (schema.allOf && Array.isArray(schema.allOf)) {
    for (const subSchema of schema.allOf) {
      validateUnified(subSchema, data, path, spec, errors, warnings);
    }
    return;
  }

  // Handle not - must not match schema
  if (schema.not) {
    const tempErrors: ValidationError[] = [];
    const tempWarnings: ValidationWarning[] = [];
    validateUnified(schema.not, data, path, spec, tempErrors, tempWarnings);

    if (tempErrors.length === 0) {
      errors.push({
        type: 'schema',
        message: `not validation failed at ${path}: data matched forbidden schema`,
        path,
        expected: 'not to match schema',
        actual: 'matched',
      });
    }
    return;
  }

  // Determine actual type
  let actualType = Array.isArray(data) ? 'array' : typeof data;

  // Type validation
  if (schema.type) {
    const expectedType = schema.type;

    if (expectedType !== actualType) {
      errors.push({
        type: 'schema',
        message: `Type mismatch at ${path}`,
        path,
        expected: expectedType,
        actual: actualType,
      });
      return; // Stop further validation if type is wrong
    }
  }

  // Enum validation - applies to ALL types
  if (schema.enum && !schema.enum.includes(data)) {
    errors.push({
      type: 'schema',
      message: `Value not in enum at ${path}`,
      path,
      expected: schema.enum,
      actual: data,
    });
  }

  // Const validation - applies to ALL types
  if (schema.const !== undefined && data !== schema.const) {
    errors.push({
      type: 'schema',
      message: `Value does not match const at ${path}`,
      path,
      expected: schema.const,
      actual: data,
    });
  }

  // STRING VALIDATIONS
  if (actualType === 'string') {
    const strValue = data as string;

    // minLength
    if (schema.minLength !== undefined && strValue.length < schema.minLength) {
      errors.push({
        type: 'schema',
        message: `String is shorter than minimum length at ${path}`,
        path,
        expected: `>= ${schema.minLength} characters`,
        actual: `${strValue.length} characters`,
      });
    }

    // maxLength
    if (schema.maxLength !== undefined && strValue.length > schema.maxLength) {
      errors.push({
        type: 'schema',
        message: `String is longer than maximum length at ${path}`,
        path,
        expected: `<= ${schema.maxLength} characters`,
        actual: `${strValue.length} characters`,
      });
    }

    // Pattern (regex)
    if (schema.pattern) {
      try {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(strValue)) {
          errors.push({
            type: 'schema',
            message: `String does not match pattern at ${path}`,
            path,
            expected: schema.pattern,
            actual: strValue,
          });
        }
      } catch (e) {
        console.warn(`[OpenAPI Validation] Invalid regex pattern: ${schema.pattern}`);
      }
    }

    // Format validation
    if (schema.format) {
      validateFormat(schema.format, strValue, path, warnings);
    }
  }

  // NUMBER/INTEGER VALIDATIONS
  if (actualType === 'number') {
    const numValue = data as number;

    // Integer check
    if (schema.type === 'integer' && !Number.isInteger(numValue)) {
      errors.push({
        type: 'schema',
        message: `Value is not an integer at ${path}`,
        path,
        expected: 'integer',
        actual: numValue,
      });
    }

    // minimum
    if (schema.minimum !== undefined && numValue < schema.minimum) {
      errors.push({
        type: 'schema',
        message: `Number below minimum at ${path}`,
        path,
        expected: `>= ${schema.minimum}`,
        actual: numValue,
      });
    }

    // maximum
    if (schema.maximum !== undefined && numValue > schema.maximum) {
      errors.push({
        type: 'schema',
        message: `Number above maximum at ${path}`,
        path,
        expected: `<= ${schema.maximum}`,
        actual: numValue,
      });
    }

    // exclusiveMinimum
    if (schema.exclusiveMinimum !== undefined) {
      const isExclusive = typeof schema.exclusiveMinimum === 'boolean' ? schema.exclusiveMinimum : true;
      const minValue = typeof schema.exclusiveMinimum === 'number' ? schema.exclusiveMinimum : schema.minimum;

      if (isExclusive && minValue !== undefined && numValue <= minValue) {
        errors.push({
          type: 'schema',
          message: `Number not above exclusive minimum at ${path}`,
          path,
          expected: `> ${minValue}`,
          actual: numValue,
        });
      }
    }

    // exclusiveMaximum
    if (schema.exclusiveMaximum !== undefined) {
      const isExclusive = typeof schema.exclusiveMaximum === 'boolean' ? schema.exclusiveMaximum : true;
      const maxValue = typeof schema.exclusiveMaximum === 'number' ? schema.exclusiveMaximum : schema.maximum;

      if (isExclusive && maxValue !== undefined && numValue >= maxValue) {
        errors.push({
          type: 'schema',
          message: `Number not below exclusive maximum at ${path}`,
          path,
          expected: `< ${maxValue}`,
          actual: numValue,
        });
      }
    }

    // multipleOf
    if (schema.multipleOf !== undefined) {
      const remainder = numValue % schema.multipleOf;
      if (Math.abs(remainder) > 1e-10) { // Account for floating point precision
        errors.push({
          type: 'schema',
          message: `Number is not a multiple of ${schema.multipleOf} at ${path}`,
          path,
          expected: `multiple of ${schema.multipleOf}`,
          actual: numValue,
        });
      }
    }
  }

  // ARRAY VALIDATIONS
  if (actualType === 'array') {
    const arrValue = data as any[];

    // minItems
    if (schema.minItems !== undefined && arrValue.length < schema.minItems) {
      errors.push({
        type: 'schema',
        message: `Array has fewer items than minimum at ${path}`,
        path,
        expected: `>= ${schema.minItems} items`,
        actual: `${arrValue.length} items`,
      });
    }

    // maxItems
    if (schema.maxItems !== undefined && arrValue.length > schema.maxItems) {
      errors.push({
        type: 'schema',
        message: `Array has more items than maximum at ${path}`,
        path,
        expected: `<= ${schema.maxItems} items`,
        actual: `${arrValue.length} items`,
      });
    }

    // uniqueItems
    if (schema.uniqueItems === true) {
      const seen = new Set();
      const duplicates: number[] = [];

      arrValue.forEach((item, index) => {
        const serialized = JSON.stringify(item);
        if (seen.has(serialized)) {
          duplicates.push(index);
        }
        seen.add(serialized);
      });

      if (duplicates.length > 0) {
        errors.push({
          type: 'schema',
          message: `Array contains duplicate items at indices: ${duplicates.join(', ')}`,
          path,
          expected: 'unique items',
          actual: 'duplicate items found',
        });
      }
    }

    // Validate array items
    if (schema.items) {
      arrValue.forEach((item, index) => {
        const itemPath = `${path}[${index}]`;
        validateUnified(schema.items, item, itemPath, spec, errors, warnings);
      });
    }

    // Contains validation - at least one item must match
    if (schema.contains) {
      let matchFound = false;

      for (let i = 0; i < arrValue.length; i++) {
        const tempErrors: ValidationError[] = [];
        const tempWarnings: ValidationWarning[] = [];
        validateUnified(schema.contains, arrValue[i], `${path}[${i}]`, spec, tempErrors, tempWarnings);

        if (tempErrors.length === 0) {
          matchFound = true;
          break;
        }
      }

      if (!matchFound) {
        errors.push({
          type: 'schema',
          message: `Array does not contain any item matching the "contains" schema at ${path}`,
          path,
          expected: 'at least one matching item',
          actual: 'no matching items',
        });
      }
    }
  }

  // OBJECT VALIDATIONS
  if (actualType === 'object') {
    const objValue = data as Record<string, any>;

    // Required properties
    if (schema.required && Array.isArray(schema.required)) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in objValue)) {
          errors.push({
            type: 'schema',
            message: `Missing required property: ${requiredProp}`,
            path: path ? `${path}.${requiredProp}` : requiredProp,
            expected: 'required',
            actual: 'undefined',
          });
        }
      }
    }

    // Validate properties
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName in objValue) {
          const propPath = path ? `${path}.${propName}` : propName;
          validateUnified(propSchema, objValue[propName], propPath, spec, errors, warnings);
        }
      }
    }

    // additionalProperties
    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(objValue)) {
        if (!schema.properties[key]) {
          warnings.push({
            type: 'extra-field',
            message: `Additional property not in spec: ${key}`,
            path: path ? `${path}.${key}` : key,
          });
        }
      }
    }

    // minProperties
    const propCount = Object.keys(objValue).length;

    if (schema.minProperties !== undefined && propCount < schema.minProperties) {
      errors.push({
        type: 'schema',
        message: `Object has fewer properties than minimum at ${path}`,
        path,
        expected: `>= ${schema.minProperties} properties`,
        actual: `${propCount} properties`,
      });
    }

    // maxProperties
    if (schema.maxProperties !== undefined && propCount > schema.maxProperties) {
      errors.push({
        type: 'schema',
        message: `Object has more properties than maximum at ${path}`,
        path,
        expected: `<= ${schema.maxProperties} properties`,
        actual: `${propCount} properties`,
      });
    }

    // patternProperties validation
    if (schema.patternProperties) {
      for (const [pattern, propSchema] of Object.entries(schema.patternProperties)) {
        try {
          const regex = new RegExp(pattern);
          for (const [key, value] of Object.entries(objValue)) {
            if (regex.test(key)) {
              const propPath = path ? `${path}.${key}` : key;
              validateUnified(propSchema, value, propPath, spec, errors, warnings);
            }
          }
        } catch (e) {
          console.warn(`[OpenAPI Validation] Invalid regex in patternProperties: ${pattern}`);
        }
      }
    }
  }

  // BOOLEAN VALIDATIONS (mainly just type and enum, handled above)
  // No additional validations needed for booleans
}

/**
 * Validate string format
 */
function validateFormat(format: string, value: string, path: string, warnings: ValidationWarning[]): void {
  const formatPatterns: Record<string, RegExp> = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    uri: /^https?:\/\/.+/,
    'uri-reference': /^(?:[a-z][a-z0-9+.-]*:)?(?:\/\/)?[^\s]*$/i,
    url: /^https?:\/\/.+/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    date: /^\d{4}-\d{2}-\d{2}$/,
    'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    time: /^\d{2}:\d{2}:\d{2}/,
    hostname: /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i,
    ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    ipv6: /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
    byte: /^[A-Za-z0-9+/]+=*$/,
  };

  const pattern = formatPatterns[format];
  if (pattern && !pattern.test(value)) {
    warnings.push({
      type: 'missing-field',
      message: `Invalid format "${format}" at ${path}`,
      path,
    });
  }
}

/**
 * Validate request body against schema
 */
function validateRequestBody(
  operation: any,
  request: any,
  spec: any,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const requestBody = operation.spec.requestBody;

  if (!requestBody) {
    return;
  }

  if (requestBody.required && (!request.body || Object.keys(request.body).length === 0)) {
    errors.push({
      type: 'schema',
      message: 'Request body is required but not provided',
      path: 'request.body',
      expected: 'required',
      actual: 'undefined',
    });
    return;
  }

  if (!request.body) {
    return;
  }

  const content = requestBody.content;
  if (!content) {
    return;
  }

  const contentType = request.contentType?.split(';')[0].trim() || 'application/json';

  const mediaTypeSpec =
    content[contentType] ||
    content['application/json'] ||
    Object.values(content)[0];

  if (!mediaTypeSpec || !mediaTypeSpec.schema) {
    return;
  }

  console.log('[OpenAPI Validation] Validating request body against schema');

  const schema = resolveSchema(mediaTypeSpec.schema, spec);
  validateUnified(schema, request.body, 'request.body', spec, errors, warnings);
}

/**
 * Validate request parameters (headers, query, path)
 */
function validateRequestParameters(
  operation: any,
  request: any,
  spec: any,
  basePath: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const parameters = operation.spec.parameters || [];

  if (parameters.length === 0) {
    return;
  }

  console.log('[OpenAPI Validation] Validating request parameters:', parameters.length, 'defined');

  // Extract actual values
  const headerMap = new Map(
    (request.headers || []).map((h: any) => [h.key.toLowerCase(), h.value])
  );

  const queryMap = new Map<string, string>();
  try {
    (request.query || []).forEach((q: any) => {
      queryMap.set(q.key, q.value);
    });
  } catch (e) { }

  const pathValues = extractPathParameters(request, operation.path, basePath);

  // Validate each parameter
  for (const param of parameters) {
    const paramLocation = param.in; // 'header', 'query', 'path', 'cookie'
    const paramName = param.name;
    const isRequired = param.required === true || paramLocation === 'path'; // path params always required

    let actualValue: any;
    let basePath: string;

    // Get actual value based on location
    if (paramLocation === 'header') {
      actualValue = headerMap.get(paramName.toLowerCase());
      basePath = `request.headers.${paramName}`;
    } else if (paramLocation === 'query') {
      actualValue = queryMap.get(paramName);
      basePath = `request.query.${paramName}`;
    } else if (paramLocation === 'path') {
      actualValue = pathValues.get(paramName);
      basePath = `request.path.${paramName}`;
    } else {
      continue; // Skip unsupported locations like 'cookie'
    }

    // Check if required parameter is missing
    if (isRequired && actualValue === undefined) {
      errors.push({
        type: 'schema',
        message: `Missing required ${paramLocation} parameter: ${paramName}`,
        path: basePath,
        expected: 'required',
        actual: 'undefined',
      });
      continue;
    }

    // If parameter doesn't exist and isn't required, skip validation
    if (actualValue === undefined) {
      continue;
    }

    // Type coercion for parameters (they come as strings)
    let coercedValue: any = actualValue;

    if (param.schema) {
      const schema = resolveSchema(param.schema, spec);

      // Coerce string values to expected types
      if (schema.type === 'number' || schema.type === 'integer') {
        coercedValue = Number(actualValue);
        if (isNaN(coercedValue)) {
          errors.push({
            type: 'schema',
            message: `Invalid type for ${paramLocation} parameter: ${paramName}`,
            path: basePath,
            expected: schema.type,
            actual: 'string (non-numeric)',
          });
          continue;
        }
      } else if (schema.type === 'boolean') {
        coercedValue = actualValue === 'true' || actualValue === '1' || actualValue === true;
      } else if (schema.type === 'array') {
        // Handle array parameters (comma-separated or multiple values)
        coercedValue = typeof actualValue === 'string' ? actualValue.split(',') : actualValue;
      }

      // Now validate using unified function
      validateUnified(schema, coercedValue, basePath, spec, errors, warnings);
    }

    // Deprecated warning
    if (param.deprecated === true) {
      warnings.push({
        type: 'deprecated',
        message: `${paramLocation} parameter is deprecated: ${paramName}`,
        path: basePath,
      });
    }
  }

  // Check for extra parameters not in spec
  const definedHeaders = new Set(
    parameters.filter((p: any) => p.in === 'header').map((p: any) => p.name.toLowerCase())
  );
  const definedQueries = new Set(
    parameters.filter((p: any) => p.in === 'query').map((p: any) => p.name)
  );
  const skipHeaders = ['host', 'user-agent', 'accept', 'accept-encoding', 'connection', 'content-length', 'content-type'];
  for (const [headerName] of headerMap) {
    if (!skipHeaders.includes(headerName as string) && !definedHeaders.has(headerName)) {
      warnings.push({
        type: 'extra-field',
        message: `Request header not defined in spec: ${headerName}`,
        path: `request.headers.${headerName}`,
      });
    }
  }

  for (const [queryName] of queryMap) {
    if (!definedQueries.has(queryName)) {
      warnings.push({
        type: 'extra-field',
        message: `Query parameter not defined in spec: ${queryName}`,
        path: `request.query.${queryName}`,
      });
    }
  }
}

/**
 * Extract path parameter values from actual request path
 * FIXED: Now properly handles base path normalization
 */
function extractPathParameters(request: any, specPath: string, basePath: string): Map<string, string> {
  let actualPath = request.path;

  // Try to extract pathname from full URL
  try {
    const url = new URL(request.url);
    actualPath = url.pathname;
  } catch (e) {
    // If URL parsing fails, clean up query string
    if (actualPath.includes('?')) {
      actualPath = actualPath.split('?')[0];
    }
  }

  // CRITICAL FIX: Normalize the actual path by removing base path
  const normalizedActualPath = normalizePath(actualPath, basePath);

  console.log('[OpenAPI Validation] Extracting path parameters:', {
    actualPath,
    basePath,
    normalizedActualPath,
    specPath
  });

  const specParts = specPath.split('/').filter((p: string) => p);
  const actualParts = normalizedActualPath.split('/').filter((p: string) => p);

  const pathValues = new Map<string, string>();

  for (let i = 0; i < specParts.length; i++) {
    const specPart = specParts[i];
    if (specPart.startsWith('{') && specPart.endsWith('}')) {
      const paramName = specPart.slice(1, -1);
      const actualValue = actualParts[i];
      if (actualValue) {
        pathValues.set(paramName, decodeURIComponent(actualValue));
      }
    }
  }

  console.log('[OpenAPI Validation] Extracted path parameters:', Object.fromEntries(pathValues));

  return pathValues;
}

/**
 * Validate response status code
 */
function validateStatusCode(
  operation: any,
  actualStatus: number,
  errors: ValidationError[]
): void {
  const responses = operation.spec.responses || {};
  const statusStr = String(actualStatus);

  if (responses[statusStr]) {
    return;
  }

  const wildcardPattern = statusStr[0] + 'XX';
  if (responses[wildcardPattern]) {
    return;
  }

  if (responses.default) {
    return;
  }

  const expectedCodes = Object.keys(responses).join(', ');
  errors.push({
    type: 'status',
    message: `Status code ${actualStatus} not defined in OpenAPI spec`,
    expected: expectedCodes,
    actual: actualStatus,
  });
}

/**
 * Validate response content type
 */
function validateContentType(
  operation: any,
  response: any,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const responses = operation.spec.responses || {};
  const statusStr = String(response.status);

  const responseSpec =
    responses[statusStr] ||
    responses[statusStr[0] + 'XX'] ||
    responses.default;

  if (!responseSpec || !responseSpec.content) {
    return;
  }

  const actualContentType = response.contentType || '';
  const definedContentTypes = Object.keys(responseSpec.content);

  const matches = definedContentTypes.some((ct: string) => {
    const cleanActual = actualContentType.split(';')[0].trim();
    const cleanDefined = ct.split(';')[0].trim();
    return cleanActual.includes(cleanDefined) || cleanDefined.includes(cleanActual);
  });

  if (!matches) {
    warnings.push({
      type: 'extra-field',
      message: `Content-Type "${actualContentType}" not defined in spec. Expected one of: ${definedContentTypes.join(', ')}`,
      path: 'response.contentType',
    });
  }
}

/**
 * Validate response body against schema
 */
function validateResponseSchema(
  operation: any,
  response: any,
  spec: any,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const responses = operation.spec.responses || {};
  const statusStr = String(response.status);

  const responseSpec =
    responses[statusStr] ||
    responses[statusStr[0] + 'XX'] ||
    responses.default;

  if (!responseSpec || !responseSpec.content) {
    return;
  }

  const contentType = response.contentType?.split(';')[0].trim() || 'application/json';

  const mediaTypeSpec =
    responseSpec.content[contentType] ||
    responseSpec.content['application/json'] ||
    Object.values(responseSpec.content)[0];

  if (!mediaTypeSpec || !mediaTypeSpec.schema) {
    return;
  }

  console.log('[OpenAPI Validation] Validating response body against schema');

  const schema = resolveSchema(mediaTypeSpec.schema, spec);
  validateUnified(schema, response.body, 'response.body', spec, errors, warnings);
}

/**
 * Validate response headers against spec
 */
function validateResponseHeaders(
  operation: any,
  response: any,
  spec: any,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const responses = operation.spec.responses || {};
  const statusStr = String(response.status);

  const responseSpec =
    responses[statusStr] ||
    responses[statusStr[0] + 'XX'] ||
    responses.default;

  if (!responseSpec || !responseSpec.headers) {
    return;
  }

  console.log('[OpenAPI Validation] Validating response headers');

  const headerMap = new Map(
    (response.headers || []).map((h: any) => [h.key.toLowerCase(), h.value])
  );

  // Validate each defined header
  for (const [headerName, headerSpec] of Object.entries(responseSpec.headers)) {
    if (!headerSpec || typeof headerSpec !== 'object') continue;

    const headerNameLower = headerName.toLowerCase();
    const isRequired = (headerSpec as any).required === true;
    const actualValue = headerMap.get(headerNameLower);
    const basePath = `response.headers.${headerName}`;

    // Check if required header is missing
    if (isRequired && actualValue === undefined) {
      errors.push({
        type: 'header',
        message: `Missing required response header: ${headerName}`,
        path: basePath,
        expected: 'required',
        actual: 'undefined',
      });
      continue;
    }

    // If header exists, validate its schema
    if (actualValue !== undefined && (headerSpec as any).schema) {
      const schema = resolveSchema((headerSpec as any).schema, spec);

      // Coerce header values (they're always strings)
      let coercedValue: any = actualValue;

      if (schema.type === 'number' || schema.type === 'integer') {
        coercedValue = Number(actualValue);
        if (isNaN(coercedValue)) {
          errors.push({
            type: 'header',
            message: `Invalid type for response header: ${headerName}`,
            path: basePath,
            expected: schema.type,
            actual: 'string (non-numeric)',
          });
          continue;
        }
      } else if (schema.type === 'boolean') {
        coercedValue = actualValue === 'true' || actualValue === '1' || actualValue === true;
      }

      validateUnified(schema, coercedValue, basePath, spec, errors, warnings);
    }

    // Deprecated warning
    if ((headerSpec as any).deprecated === true) {
      warnings.push({
        type: 'deprecated',
        message: `Response header is deprecated: ${headerName}`,
        path: basePath,
      });
    }
  }
}