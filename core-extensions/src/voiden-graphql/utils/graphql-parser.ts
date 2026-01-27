export interface GraphQLField {
  name: string;
  type: string;
  args?: Array<{ name: string; type: string }>;
}

export interface GraphQLType {
  name: string;
  fields: GraphQLField[];
}

export interface ParsedSchema {
  queries: GraphQLField[];
  mutations: GraphQLField[];
  subscriptions: GraphQLField[];
  types: GraphQLType[];
}

/**
 * Parse arguments from a GraphQL schema string
 * @param argsString - String containing arguments in format "(arg1: Type1, arg2: Type2)"
 * @returns Array of argument objects with name and type
 */
export const parseArgs = (argsString: string): Array<{ name: string; type: string }> => {
  const args: Array<{ name: string; type: string }> = [];
  const argRegex = /(\w+)\s*:\s*([^,)]+)/g;
  let match;
  while ((match = argRegex.exec(argsString)) !== null) {
    args.push({
      name: match[1],
      type: match[2].trim()
    });
  }
  return args;
};

/**
 * Parse GraphQL schema content and extract queries, mutations, subscriptions, and types
 * @param schemaContent - Raw GraphQL schema string
 * @returns Parsed schema with all operations and types
 */
export const parseGraphQLSchema = (schemaContent: string): ParsedSchema => {
  const parsed: ParsedSchema = {
    queries: [],
    mutations: [],
    subscriptions: [],
    types: []
  };

  // Parse Query type
  const queryMatch = schemaContent.match(/type\s+Query\s*\{([^}]*)\}/s);
  if (queryMatch) {
    const queryBody = queryMatch[1];
    const fieldRegex = /(\w+)(\([^)]*\))?\s*:\s*([^\n]+)/g;
    let match;
    while ((match = fieldRegex.exec(queryBody)) !== null) {
      parsed.queries.push({
        name: match[1],
        type: match[3].trim(),
        args: match[2] ? parseArgs(match[2]) : undefined
      });
    }
  }

  // Parse Mutation type
  const mutationMatch = schemaContent.match(/type\s+Mutation\s*\{([^}]*)\}/s);
  if (mutationMatch) {
    const mutationBody = mutationMatch[1];
    const fieldRegex = /(\w+)(\([^)]*\))?\s*:\s*([^\n]+)/g;
    let match;
    while ((match = fieldRegex.exec(mutationBody)) !== null) {
      parsed.mutations.push({
        name: match[1],
        type: match[3].trim(),
        args: match[2] ? parseArgs(match[2]) : undefined
      });
    }
  }

  // Parse Subscription type
  const subscriptionMatch = schemaContent.match(/type\s+Subscription\s*\{([^}]*)\}/s);
  if (subscriptionMatch) {
    const subscriptionBody = subscriptionMatch[1];
    const fieldRegex = /(\w+)(\([^)]*\))?\s*:\s*([^\n]+)/g;
    let match;
    while ((match = fieldRegex.exec(subscriptionBody)) !== null) {
      parsed.subscriptions.push({
        name: match[1],
        type: match[3].trim(),
        args: match[2] ? parseArgs(match[2]) : undefined
      });
    }
  }

  // Parse all other types (excluding Query, Mutation, Subscription, and scalars)
  const typeRegex = /type\s+(\w+)(?!\s*@)\s*\{([^}]*)\}/gs;
  let typeMatch;
  while ((typeMatch = typeRegex.exec(schemaContent)) !== null) {
    const typeName = typeMatch[1];
    // Skip Query, Mutation, and Subscription as they're already parsed
    if (typeName === 'Query' || typeName === 'Mutation' || typeName === 'Subscription') {
      continue;
    }
    
    const typeBody = typeMatch[2];
    const fields: GraphQLField[] = [];
    const fieldRegex = /(\w+)(\([^)]*\))?\s*:\s*([^\n]+)/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(typeBody)) !== null) {
      fields.push({
        name: fieldMatch[1],
        type: fieldMatch[3].trim(),
        args: fieldMatch[2] ? parseArgs(fieldMatch[2]) : undefined
      });
    }
    
    parsed.types.push({
      name: typeName,
      fields
    });
  }

  return parsed;
};

/**
 * Load and parse a GraphQL schema file
 * @param filePath - Absolute path to the schema file
 * @returns Promise resolving to parsed schema or null on error
 */
export const loadSchemaFile = async (filePath: string): Promise<ParsedSchema | null> => {
  try {
    if (typeof window !== 'undefined' && (window as any).electron?.files?.read) {
      const content = await (window as any).electron.files.read(filePath);
      if (content && typeof content === 'string') {
        return parseGraphQLSchema(content);
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to load schema file:', error);
    return null;
  }
};

/**
 * Parse an existing GraphQL query to extract field selections
 * @param queryBody - The query string to parse
 * @param operationName - Name of the operation to extract fields for
 * @returns Set of selected field names
 */
export const parseQueryFields = (queryBody: string, operationName: string): Set<string> => {
  const fieldMatches = queryBody.match(new RegExp(`${operationName}[^{]*{([^}]*)}`, 's'));
  const parsedFields = new Set<string>();
  
  if (fieldMatches && fieldMatches[1]) {
    const fieldsText = fieldMatches[1];
    const fieldNames = fieldsText
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line && !line.startsWith('#'))
      .map((line: string) => line.split(/[\s(:]/)[0])
      .filter(Boolean);
    
    fieldNames.forEach(name => parsedFields.add(name));
  }
  
  return parsedFields;
};

/**
 * Check if an operation is present in a query body
 * @param queryBody - The query string to check
 * @param operationName - Name of the operation to look for
 * @returns True if operation is present
 */
export const isOperationInQuery = (queryBody: string, operationName: string): boolean => {
  const operationPattern = new RegExp(`\\b${operationName}\\b`, 'i'); // 'i' flag for case-insensitive
  return operationPattern.test(queryBody);
};

/**
 * Extract variable definitions from a GraphQL query
 * @param queryText - The GraphQL query string
 * @returns Object with variable names as keys and their types as values
 */
export const extractVariablesFromQuery = (queryText: string): Record<string, string> => {
  const variables: Record<string, string> = {};
  
  // Match all variable declarations in the query headers
  // Pattern: $variableName: Type or $variableName: Type!
  const variablePattern = /\$(\w+)\s*:\s*([^,)]+)/g;
  let match;
  
  while ((match = variablePattern.exec(queryText)) !== null) {
    const varName = match[1];
    const varType = match[2].trim();
    variables[varName] = varType;
  }
  
  return variables;
};

/**
 * Generate default variable values based on GraphQL type
 * @param typeName - GraphQL type (e.g., "String!", "Int", "[String]")
 * @returns Default value for the type
 */
export const getDefaultValueForType = (typeName: string): any => {
  const baseType = typeName.replace(/[!\[\]]/g, '');
  const isArray = typeName.includes('[');
  const isRequired = typeName.includes('!');
  
  if (isArray) {
    return [];
  }
  
  switch (baseType) {
    case 'String':
      return '';
    case 'Int':
    case 'Float':
      return 0;
    case 'Boolean':
      return false;
    case 'ID':
      return '';
    default:
      return null; // For custom types
  }
};

/**
 * Create variables JSON object from query with default values
 * @param queryText - The GraphQL query string
 * @param existingVariables - Existing variable values to preserve
 * @param operationName - Specific operation to extract variables from (optional)
 * @param selectedArgs - Set of argument names that are selected/checked (optional)
 * @returns JSON string of variables with defaults
 */
export const generateVariablesFromQuery = (
  queryText: string, 
  existingVariables?: Record<string, any>,
  operationName?: string,
  selectedArgs?: Set<string>
): string => {
  // If operationName is provided, filter to only that operation's variables
  let relevantQuery = queryText;
  if (operationName) {
    // Extract only the specific operation's variable declarations from the header
    // Pattern: (query|mutation|subscription) OperationName($var1: Type1, $var2: Type2) { ... }
    const operationPattern = new RegExp(
      `(query|mutation|subscription)\\s+${operationName}\\s*\\(([^)]+)\\)\\s*\\{`,
      's'
    );
    const match = queryText.match(operationPattern);
    
    if (match) {
      // Extract just the parameter list from this specific operation
      const paramList = match[2];
      relevantQuery = paramList;
    } else {
      // If no match found, try without parameters
      const noParamsPattern = new RegExp(
        `(query|mutation|subscription)\\s+${operationName}\\s*\\{`,
        's'
      );
      if (queryText.match(noParamsPattern)) {
        relevantQuery = ''; // No variables for this operation
      }
    }
  }
  
  const extractedVars = extractVariablesFromQuery(relevantQuery);
  const variables: Record<string, any> = {};
  
  // Parse existing variables if provided
  let existing: Record<string, any> = {};
  if (existingVariables && typeof existingVariables === 'object') {
    existing = existingVariables;
  } else if (typeof existingVariables === 'string') {
    try {
      existing = JSON.parse(existingVariables);
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  // For each extracted variable, use existing value or generate default
  // Only include if no selectedArgs filter, or if the arg is selected
  for (const [varName, varType] of Object.entries(extractedVars)) {
    // Skip if selectedArgs is provided and this arg is not selected
    if (selectedArgs && selectedArgs.size > 0 && !selectedArgs.has(varName)) {
      continue;
    }
    
    if (varName in existing) {
      variables[varName] = existing[varName];
    } else {
      variables[varName] = getDefaultValueForType(varType);
    }
  }
  
  return JSON.stringify(variables, null, 2);
};
