/**
 * GraphQL Query Generation Utilities
 * Handles generation of GraphQL queries from field selections
 */

import type { ParsedSchema, GraphQLField } from '../utils/graphql-parser';

export interface QueryGenerationInput {
  schema: ParsedSchema;
  selectedOperations: Set<string>;
  operationFieldSelections: Record<string, Set<string>>;
  fieldArgSelections: Record<string, Record<string, Set<string>>>;
  operationArgSelections: Record<string, Set<string>>;
  nestedFieldSelections: Record<string, Record<string, Set<string>>>;
  activeTab: 'query' | 'mutation' | 'subscription';
}

export interface QueryGenerationResult {
  query: string;
  operationType: 'query' | 'mutation' | 'subscription' | '';
}

/**
 * Recursively build field string with nested fields
 */
function buildFieldString(
  fieldName: string,
  fieldDef: GraphQLField | undefined,
  fieldPath: string,
  opName: string,
  schema: ParsedSchema,
  fieldArgSelections: Record<string, Record<string, Set<string>>>,
  nestedFieldSelections: Record<string, Record<string, Set<string>>>,
  depth: number = 0
): string {
  if (!fieldDef) return fieldName;
  
  const indent = '  '.repeat(depth + 2);
  let result = '';
  
  // Add field arguments if any - use full field path as key
  const selectedArgs = fieldArgSelections[opName]?.[fieldPath];
  if (selectedArgs && selectedArgs.size > 0) {
    const argsStr = Array.from(selectedArgs)
      .map(argName => `${argName}: $${opName}_${fieldPath.replace(/\./g, '_')}_${argName}`)
      .join(', ');
    result = `${fieldName}(${argsStr})`;
  } else {
    result = fieldName;
  }
  
  // Check if field has subfields selected - use exact path match
  const nestedFields = nestedFieldSelections[opName]?.[fieldPath];
  if (nestedFields && nestedFields.size > 0) {
    const fieldReturnTypeName = fieldDef.type.replace(/[\[\]!]/g, '');
    const fieldReturnType = schema.types.find((t: any) => t.name.toLowerCase() === fieldReturnTypeName.toLowerCase());
    
    if (fieldReturnType && fieldReturnType.fields) {
      const subfieldStrs: string[] = [];
      Array.from(nestedFields).forEach(subfieldName => {
        const subfieldDef = fieldReturnType.fields.find((f: any) => f.name.toLowerCase() === subfieldName.toLowerCase());
        const subfieldPath = `${fieldPath}.${subfieldName}`;
        const subfieldStr = buildFieldString(
          subfieldName,
          subfieldDef,
          subfieldPath,
          opName,
          schema,
          fieldArgSelections,
          nestedFieldSelections,
          depth + 1
        );
        subfieldStrs.push(`${indent}  ${subfieldStr}`);
      });
      result += ` {\n${subfieldStrs.join('\n')}\n${indent}}`;
    }
  }
  
  return result;
}

/**
 * Build fragments for operation type
 */
function buildFragmentsForType(
  operations: Array<{ operation: GraphQLField; fields: Set<string>; opName: string }>,
  schema: ParsedSchema,
  operationArgSelections: Record<string, Set<string>>,
  fieldArgSelections: Record<string, Record<string, Set<string>>>,
  nestedFieldSelections: Record<string, Record<string, Set<string>>>
): string[] {
  return operations.map(({ operation, fields, opName }) => {
    // Get selected operation arguments
    const selectedOpArgs = operationArgSelections[opName];
    const opArgsToInclude = operation!.args?.filter((arg: any) => selectedOpArgs?.has(arg.name)) || [];
    const argsStr = opArgsToInclude.length
      ? `(${opArgsToInclude.map((arg: any) => `${arg.name}: $${arg.name}`).join(', ')})`
      : '';
    
    // Get return type to check field arguments - use exact match with case insensitive comparison
    const returnTypeName = operation!.type.replace(/[\[\]!]/g, '');
    const returnType = schema.types.find((t: any) => t.name.toLowerCase() === returnTypeName.toLowerCase());
    
    // Build fields with their selected arguments and nested fields
    const fieldStrs: string[] = [];
    if (fields.size > 0 && returnType) {
      Array.from(fields).forEach(fieldName => {
        const fieldDef = returnType.fields.find((f: any) => f.name.toLowerCase() === fieldName.toLowerCase());
        const fieldStr = buildFieldString(
          fieldName,
          fieldDef,
          fieldName,
          opName,
          schema,
          fieldArgSelections,
          nestedFieldSelections
        );
        fieldStrs.push(fieldStr);
      });
    }
    
    // If no fields selected, show placeholder comment
    const fieldsStr = fieldStrs.length > 0 
      ? fieldStrs.join('\n    ')
      : '';
    
    return `  ${operation!.name}${argsStr} {\n    ${fieldsStr}\n  }`;
  });
}

/**
 * Collect arguments for operations
 */
function collectArgsForOperations(
  operations: Array<{ operation: GraphQLField; fields: Set<string>; opName: string }>,
  schema: ParsedSchema,
  operationArgSelections: Record<string, Set<string>>,
  fieldArgSelections: Record<string, Record<string, Set<string>>>
): Map<string, string> {
  const args = new Map<string, string>();
  
  operations.forEach(({ operation, fields, opName }) => {
    // Add operation-level arguments (only selected ones)
    const selectedOpArgs = operationArgSelections[opName];
    operation!.args?.forEach((arg: any) => {
      if (selectedOpArgs?.has(arg.name)) {
        args.set(arg.name, arg.type);
      }
    });
    
    // Add field-level arguments using field paths
    const returnTypeName = operation!.type.replace(/[\[\]!]/g, '');
    const returnType = schema.types.find((t: any) => t.name === returnTypeName);
    if (returnType) {
      Array.from(fields).forEach(fieldName => {
        const fieldDef = returnType.fields.find((f: any) => f.name === fieldName);
        // Use field path instead of just field name
        const selectedArgs = fieldArgSelections[opName]?.[fieldName];
        if (fieldDef && selectedArgs && selectedArgs.size > 0) {
          Array.from(selectedArgs).forEach(argName => {
            const argDef = fieldDef.args!.find((a: any) => a.name === argName);
            if (argDef) {
              args.set(`${opName}_${fieldName}_${argName}`, argDef.type);
            }
          });
        }
      });
    }
  });
  
  return args;
}

/**
 * Generate GraphQL query from selections
 */
export function generateQuery(input: QueryGenerationInput): QueryGenerationResult {
  const {
    schema,
    selectedOperations,
    operationFieldSelections,
    fieldArgSelections,
    operationArgSelections,
    nestedFieldSelections,
    activeTab
  } = input;

  // Get all operations from all tabs
  const allOperations = [
    ...(schema.queries || []),
    ...(schema.mutations || []),
    ...(schema.subscriptions || [])
  ];
  
  // Filter selected operations
  const operationsToInclude = Array.from(selectedOperations)
    .map(opName => {
      const operation = allOperations.find(op => op.name === opName);
      const fields = operationFieldSelections[opName] || new Set();
      return { operation, fields, opName };
    })
    .filter(item => item.operation);
  
  // Don't generate if no operations selected
  if (operationsToInclude.length === 0) {
    return { query: '', operationType: '' };
  }

  // Group operations by type
  const groupedOperations: {
    queries: Array<{ operation: GraphQLField; fields: Set<string>; opName: string }>;
    mutations: Array<{ operation: GraphQLField; fields: Set<string>; opName: string }>;
    subscriptions: Array<{ operation: GraphQLField; fields: Set<string>; opName: string }>;
  } = { queries: [], mutations: [], subscriptions: [] };

  operationsToInclude.forEach(item => {
    if (item.operation && schema.queries.includes(item.operation)) {
      groupedOperations.queries.push(item as { operation: GraphQLField; fields: Set<string>; opName: string });
    } else if (item.operation && schema.mutations.includes(item.operation)) {
      groupedOperations.mutations.push(item as { operation: GraphQLField; fields: Set<string>; opName: string });
    } else if (item.operation && schema.subscriptions.includes(item.operation)) {
      groupedOperations.subscriptions.push(item as { operation: GraphQLField; fields: Set<string>; opName: string });
    }
  });

  // Build query blocks for each operation type
  const queryBlocks: string[] = [];
  let primaryOperationType: 'query' | 'mutation' | 'subscription' = activeTab;

  if (groupedOperations.queries.length > 0) {
    primaryOperationType = 'query';
    const fragments = buildFragmentsForType(
      groupedOperations.queries,
      schema,
      operationArgSelections,
      fieldArgSelections,
      nestedFieldSelections
    );
    const args = collectArgsForOperations(
      groupedOperations.queries,
      schema,
      operationArgSelections,
      fieldArgSelections
    );
    const argsHeader = args.size > 0
      ? `(${Array.from(args.entries()).map(([name, type]) => `$${name}: ${type}`).join(', ')})`
      : '';
    const queryName = groupedOperations.queries.length === 1
      ? groupedOperations.queries[0].operation!.name.charAt(0).toUpperCase() + groupedOperations.queries[0].operation!.name.slice(1)
      : 'CombinedQuery';
    queryBlocks.push(`query ${queryName}${argsHeader} {\n${fragments.join('\n')}\n}`);
  }

  if (groupedOperations.mutations.length > 0) {
    if (primaryOperationType === activeTab) primaryOperationType = 'mutation';
    const fragments = buildFragmentsForType(
      groupedOperations.mutations,
      schema,
      operationArgSelections,
      fieldArgSelections,
      nestedFieldSelections
    );
    const args = collectArgsForOperations(
      groupedOperations.mutations,
      schema,
      operationArgSelections,
      fieldArgSelections
    );
    const argsHeader = args.size > 0
      ? `(${Array.from(args.entries()).map(([name, type]) => `$${name}: ${type}`).join(', ')})`
      : '';
    const mutationName = groupedOperations.mutations.length === 1
      ? groupedOperations.mutations[0].operation!.name.charAt(0).toUpperCase() + groupedOperations.mutations[0].operation!.name.slice(1)
      : 'CombinedMutation';
    queryBlocks.push(`mutation ${mutationName}${argsHeader} {\n${fragments.join('\n')}\n}`);
  }

  if (groupedOperations.subscriptions.length > 0) {
    if (primaryOperationType === activeTab) primaryOperationType = 'subscription';
    const fragments = buildFragmentsForType(
      groupedOperations.subscriptions,
      schema,
      operationArgSelections,
      fieldArgSelections,
      nestedFieldSelections
    );
    const args = collectArgsForOperations(
      groupedOperations.subscriptions,
      schema,
      operationArgSelections,
      fieldArgSelections
    );
    const argsHeader = args.size > 0
      ? `(${Array.from(args.entries()).map(([name, type]) => `$${name}: ${type}`).join(', ')})`
      : '';
    const subscriptionName = groupedOperations.subscriptions.length === 1
      ? groupedOperations.subscriptions[0].operation!.name.charAt(0).toUpperCase() + groupedOperations.subscriptions[0].operation!.name.slice(1)
      : 'CombinedSubscription';
    queryBlocks.push(`subscription ${subscriptionName}${argsHeader} {\n${fragments.join('\n')}\n}`);
  }

  // Join operations without blank lines
  const query = queryBlocks.join('\n');

  return {
    query,
    operationType: primaryOperationType || ''
  };
}
