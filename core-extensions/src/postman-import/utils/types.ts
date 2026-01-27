/**
 * Postman Collection Types
 */

export interface PostmanCollection {
  info: PostmanInfo;
  item: PostmanItem[];
  variable:[{key:string,value:string}]
}

export interface PostmanInfo {
  _postman_id: string;
  name: string;
  schema: string;
  description?: string;
}

export type PostmanItem = PostmanFolder | PostmanRequest;

export interface PostmanFolder {
  name: string;
  item: PostmanItem[];
  description?: string;
}

export interface PostmanRequest {
  name: string;
  request: PostmanRequestDetail;
  event?: {
    listen: string;
    script: {
      exec: string[];
      type: string;
      packages: Record<string, string>;
    };
  }[];
}

export interface PostmanRequestDetail {
  method: string;
  header: PostmanHeader[];
  body?: PostmanRequestBody;
  url: PostmanUrl | string; // Support both v2.0.0 (string) and v2.1.0 (object)
  auth?: PostmanAuth;
  description?:string
}

export interface PostmanHeader {
  key: string;
  value: string;
  type: string;
  disabled?: boolean;
}

export interface PostmanRequestBody {
  mode: string;
  raw?: string;
  formdata?: PostmanFormParam[];
  urlencoded?: PostmanFormParam[];
  options?: {
    raw?: {
      language?: string;
    };
  };
}

export interface PostmanFormParam {
  key: string;
  value: string;
  type?: string;
  disabled?: boolean;
}

export interface PostmanUrl {
  raw: string;
  protocol: string;
  host: string[];
  port?: string;
  path: string[];
  query?: PostmanQueryParameter[];
}

export interface PostmanQueryParameter {
  key: string;
  value: string;
  disabled?: boolean;
}

export interface PostmanAuth {
  type: string;
  basic?: {
    username: string;
    password: string;
  };
  bearer?: {
    token: string;
  };
  apikey?: {
    key: string;
    value: string;
  };
}

export function isPostmanFolder(item: PostmanItem): item is PostmanFolder {
  return (item as PostmanFolder).item !== undefined;
}

/**
 * Normalize URL to always return a string
 * Handles both v2.0.0 (string) and v2.1.0 (object) formats
 */
export function normalizePostmanUrl(url: PostmanUrl | string): string {
  if (typeof url === 'string') {
    return url;
  }
  return url.raw;
}
