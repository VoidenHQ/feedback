export interface Parameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  schema?: Schema;
}

export interface Schema {
  description?: string;
  type: string;
  format?: string;
  items?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  example?: unknown;
  required?: string[];
}

export interface RequestBody {
  description?: string;
  content: {
    [mediaType: string]: {
      schema: Schema;
    };
  };
}

export interface Response {
  description: string;
  content?: {
    [mediaType: string]: {
      schema: {
        type: string;
        properties?: Record<string, unknown>;
        items?: Record<string, unknown>;
      };
    };
  };
}

export interface PathMethod {
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: {
    [statusCode: string]: Response;
  };
  security?: {
    [securityScheme: string]: string[];
  }[];
}

export interface Path {
  [path: string]: {
    [method: string]: PathMethod;
  };
}

export interface Components {
  schemas?: Record<string, Schema>;
  responses?: Record<string, Response>;
  parameters?: Record<string, Parameter>;
  requestBodies?: Record<string, RequestBody>;
  headers?: Record<string, unknown>;
  securitySchemes?: Record<string, unknown>;
  links?: Record<string, unknown>;
  callbacks?: Record<string, unknown>;
}

export interface OpenAPISpec {
  openapi: string;
  info: {
    title?: string;
    version?: string;
    description?: string;
  };
  security: {
    [securityScheme: string]: string[];
  }[];
  servers: { url: string }[];
  paths: Path;
  components?: Components;
}

export interface ValidationResponse {
  valid: boolean;
  errors: string[];
}

export interface RequestDetails {
  server: string;
  method: string;
  path: string;
  parameters: {
    in: string;
    key: string;
    value: string;
  }[];
  requestBody?: RequestBody;
}
