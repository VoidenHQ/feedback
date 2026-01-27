import { validateOpenAPI } from "./openapiValidationEngine";

export interface OpenAPIValidation {
  specFilePath?: string;
  specFilename?: string;
  isExternalSpec?: string;
}

export interface OpenAPIValidationResult {
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  validatedAgainst: {
    path: string;
    method: string;
    operationId?: string;
  };
}

export interface ValidationError {
  type: 'schema' | 'status' | 'header' | 'content-type';
  message: string;
  path?: string;
  expected?: any;
  actual?: any;
}

export interface ValidationWarning {
  type: 'missing-field' | 'extra-field' | 'deprecated';
  message: string;
  path?: string;
}

export interface OpenAPIValidationContext {
  response: {
    status: number;
    statusText: string;
    headers: Array<{ key: string; value: string }>;
    body: any;
    contentType: string | null;
  };
  request: {
    method: string;
    path: string;
    url: string;
    headers:any,
    body?:string,
    query?:[],
    pathParam?:[],
    contentType?:string
  };
}


export function extractOpenAPIValidationFromDoc(doc: any): OpenAPIValidation | null {
  if (!doc || !doc.content) {
    return null;
  }

  let validation: OpenAPIValidation = {};
  let found = false;

  function traverse(node: any) {
    if (!node || found) return;
    if (node.type === 'openapispecLink') {
      const filePath = node.attrs?.filePath;
      const filename = node.attrs?.filename;
      const isExternal = node.attrs?.isExternal;

      if (filePath) {
        validation.specFilePath = filePath;
        validation.specFilename = filename;
        validation.isExternalSpec = isExternal;
        found = true; // stop traversal now
      }
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        traverse(child);
        if (found) return; 
      }
    }
  }
  traverse(doc);
  if (!found) {
    return null;
  }

  return validation;
}

