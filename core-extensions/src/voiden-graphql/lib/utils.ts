/**
 * GraphQL utility functions
 */

/**
 * Parse GraphQL operation to extract type and name
 */
export function parseGraphQLOperation(query: string): {
  operationType: 'query' | 'mutation' | 'subscription';
  operationName?: string;
} {
  const trimmedQuery = query.trim();
  
  // Match operation type and optional name
  const operationMatch = trimmedQuery.match(/^(query|mutation|subscription)\s+(\w+)?/i);
  
  if (operationMatch) {
    return {
      operationType: operationMatch[1].toLowerCase() as 'query' | 'mutation' | 'subscription',
      operationName: operationMatch[2],
    };
  }

  // Default to query if no explicit operation
  return {
    operationType: 'query',
  };
}

/**
 * Extract variables from GraphQL query
 */
export function extractVariablesFromQuery(query: string): string[] {
  const variableMatches = query.match(/\$\w+/g);
  if (!variableMatches) return [];
  
  // Remove duplicates and return
  return [...new Set(variableMatches)];
}

/**
 * Validate GraphQL query syntax (basic)
 */
export function validateGraphQLQuery(query: string): { valid: boolean; error?: string } {
  if (!query || query.trim().length === 0) {
    return { valid: false, error: 'Query cannot be empty' };
  }

  // Check for balanced braces
  let braceCount = 0;
  for (const char of query) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (braceCount < 0) {
      return { valid: false, error: 'Unbalanced closing brace' };
    }
  }

  if (braceCount !== 0) {
    return { valid: false, error: 'Unbalanced braces' };
  }

  return { valid: true };
}

/**
 * Generate introspection query
 */
export function getIntrospectionQuery(): string {
  return `
    query IntrospectionQuery {
      __schema {
        queryType { name }
        mutationType { name }
        subscriptionType { name }
        types {
          ...FullType
        }
        directives {
          name
          description
          locations
          args {
            ...InputValue
          }
        }
      }
    }

    fragment FullType on __Type {
      kind
      name
      description
      fields(includeDeprecated: true) {
        name
        description
        args {
          ...InputValue
        }
        type {
          ...TypeRef
        }
        isDeprecated
        deprecationReason
      }
      inputFields {
        ...InputValue
      }
      interfaces {
        ...TypeRef
      }
      enumValues(includeDeprecated: true) {
        name
        description
        isDeprecated
        deprecationReason
      }
      possibleTypes {
        ...TypeRef
      }
    }

    fragment InputValue on __InputValue {
      name
      description
      type { ...TypeRef }
      defaultValue
    }

    fragment TypeRef on __Type {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  `.trim();
}

/**
 * Check if response has GraphQL errors
 */
export function hasGraphQLErrors(response: any): boolean {
  return response && Array.isArray(response.errors) && response.errors.length > 0;
}

/**
 * Format GraphQL error for display
 */
export function formatGraphQLError(error: any): string {
  let message = error.message || 'Unknown error';
  
  if (error.locations && error.locations.length > 0) {
    const loc = error.locations[0];
    message += ` (line ${loc.line}, column ${loc.column})`;
  }
  
  if (error.path && error.path.length > 0) {
    message += ` at path: ${error.path.join('.')}`;
  }
  
  return message;
}
