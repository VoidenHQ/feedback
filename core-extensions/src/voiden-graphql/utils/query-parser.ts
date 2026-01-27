/**
 * GraphQL Query Parsing Utilities
 * Handles parsing of GraphQL queries to extract operations, fields, and arguments
 */

export interface ParsedOperation {
  name: string;
  type: string;
}

export interface ParsedFieldSelections {
  selectedOperations: Set<string>;
  operationFieldSelections: Record<string, Set<string>>;
  operationArgSelections: Record<string, Set<string>>;
  fieldArgSelections: Record<string, Record<string, Set<string>>>;
  nestedFieldSelections: Record<string, Record<string, Set<string>>>;
}

/**
 * Extract operation names and types from GraphQL query text
 */
export function extractOperations(queryText: string): ParsedOperation[] {
  const operationPattern = /^\s*(query|mutation|subscription)\s+([\w]+)/gm;
  const operations: ParsedOperation[] = [];
  let match;
  
  while ((match = operationPattern.exec(queryText)) !== null) {
    if (match[2]) {
      operations.push({
        name: match[2],
        type: match[1]
      });
    }
  }
  
  // If no named operations found, check for anonymous operations
  if (operations.length === 0 && queryText.trim()) {
    // Check for anonymous query/mutation/subscription
    const anonymousPattern = /^\s*(query|mutation|subscription)\s*\{/m;
    const anonymousMatch = queryText.match(anonymousPattern);
    if (anonymousMatch) {
      operations.push({
        name: anonymousMatch[1],
        type: anonymousMatch[1]
      });
    } else if (queryText.includes('{')) {
      // Default to anonymous query
      operations.push({
        name: 'query',
        type: 'query'
      });
    }
  }
  
  return operations;
}

/**
 * Parse nested fields recursively from GraphQL query content
 * Separates top-level fields from nested fields based on brace depth
 */
export function parseFieldsRecursively(
  content: string,
  operationName: string,
  fieldPath: string,
  nestedFieldSelections: Record<string, Record<string, Set<string>>>,
  depth: number = 0
): Set<string> {
  const fields = new Set<string>();
  let i = 0;
  
  while (i < content.length) {
    // Skip whitespace and commas
    while (i < content.length && /[\s\n,]/.test(content[i])) {
      i++;
    }
    
    if (i >= content.length) break;
    
    // Extract field name (everything until whitespace, comma, paren, or brace)
    let fieldName = '';
    while (i < content.length && !/[\s\n,({]/.test(content[i])) {
      fieldName += content[i];
      i++;
    }
    
    if (!fieldName) continue;
    
    // Skip whitespace after field name
    while (i < content.length && /[\s\n]/.test(content[i])) {
      i++;
    }
    
    // Check if this field has arguments
    if (i < content.length && content[i] === '(') {
      let parenDepth = 1;
      i++; // Skip opening paren
      while (i < content.length && parenDepth > 0) {
        if (content[i] === '(') parenDepth++;
        else if (content[i] === ')') parenDepth--;
        i++;
      }
      // Skip whitespace after arguments
      while (i < content.length && /[\s\n]/.test(content[i])) {
        i++;
      }
    }
    
    // Check if this field has nested selection (opening brace)
    if (i < content.length && content[i] === '{') {
      // This is a nested field
      fields.add(fieldName);
      
      // Extract nested content
      let braceDepth = 1;
      i++; // Skip opening brace
      const nestedStart = i;
      
      while (i < content.length && braceDepth > 0) {
        if (content[i] === '{') braceDepth++;
        else if (content[i] === '}') braceDepth--;
        if (braceDepth > 0) i++;
      }
      
      const nestedContent = content.substring(nestedStart, i);
      i++; // Skip closing brace
      
      // Parse nested fields recursively
      const currentFieldPath = depth === 0 ? fieldName : `${fieldPath}.${fieldName}`;
      const nestedFields = parseFieldsRecursively(
        nestedContent,
        operationName,
        currentFieldPath,
        nestedFieldSelections,
        depth + 1
      );
      
      // Store nested fields
      if (!nestedFieldSelections[operationName]) {
        nestedFieldSelections[operationName] = {};
      }
      nestedFieldSelections[operationName][currentFieldPath] = nestedFields;
    } else {
      // Simple field (leaf node)
      fields.add(fieldName);
    }
  }
  
  return fields;
}

/**
 * Extract operation block (with arguments and selection set) from query
 * Ensures we match at the start of a field (not in the middle of a word)
 */
function extractOperationBlock(
  editorQuery: string,
  operationName: string
): { operationArgs: string; selectionSet: string } | null {
  // Find the operation pattern with word boundary: operationName(args)? { ... }
  const operationPattern = new RegExp(`(?:^|[\\s\\n,])${operationName}\\s*`, 'm');
  const operationMatch = operationPattern.exec(editorQuery);
  
  if (!operationMatch) return null;
  
  // Adjust position to skip the leading whitespace/comma if any
  let pos = operationMatch.index;
  // Skip to the actual operation name start
  while (pos < editorQuery.length && /[\s\n,]/.test(editorQuery[pos])) {
    pos++;
  }
  // Skip the operation name
  pos += operationName.length;
  
  let operationArgs = '';
  
  // Skip whitespace after operation name
  while (pos < editorQuery.length && /[\s\n]/.test(editorQuery[pos])) {
    pos++;
  }
  
  // Check if there are arguments in parentheses
  if (pos < editorQuery.length && editorQuery[pos] === '(') {
    let parenDepth = 1;
    pos++; // Skip opening paren
    const argsStart = pos;
    
    while (pos < editorQuery.length && parenDepth > 0) {
      if (editorQuery[pos] === '(') parenDepth++;
      else if (editorQuery[pos] === ')') parenDepth--;
      if (parenDepth > 0) pos++;
    }
    
    operationArgs = editorQuery.substring(argsStart, pos);
    pos++; // Skip closing paren
  }
  
  // Skip whitespace to find opening brace
  while (pos < editorQuery.length && /[\s\n]/.test(editorQuery[pos])) {
    pos++;
  }
  
  if (pos >= editorQuery.length || editorQuery[pos] !== '{') return null;
  
  // Extract selection set
  pos++; // Skip opening brace
  const selectionStart = pos;
  let braceDepth = 1;
  
  while (pos < editorQuery.length && braceDepth > 0) {
    if (editorQuery[pos] === '{') braceDepth++;
    else if (editorQuery[pos] === '}') braceDepth--;
    if (braceDepth > 0) pos++;
  }
  
  const selectionSet = editorQuery.substring(selectionStart, pos);
  
  return { operationArgs, selectionSet };
}

/**
 * Parse operation arguments to extract argument names
 */
function parseOperationArguments(operationArgs: string): Set<string> {
  const argNames = new Set<string>();
  const argRegex = /(\w+)\s*:/g;
  let match;
  
  while ((match = argRegex.exec(operationArgs)) !== null) {
    argNames.add(match[1]);
  }
  
  return argNames;
}

/**
 * Parse field arguments within a selection set
 */
function parseFieldArguments(
  selectionSet: string,
  fieldName: string
): Set<string> {
  const argNames = new Set<string>();
  const fieldPattern = new RegExp(`\\b${fieldName}\\s*\\(([^)]*)\\)`, 's');
  const fieldMatch = selectionSet.match(fieldPattern);
  
  if (fieldMatch && fieldMatch[1]) {
    const argRegex = /(\w+)\s*:/g;
    let match;
    while ((match = argRegex.exec(fieldMatch[1])) !== null) {
      argNames.add(match[1]);
    }
  }
  
  return argNames;
}

/**
 * Extract all operation blocks from the query document
 */
function extractAllOperationBlocks(editorQuery: string): Array<{
  operationType: string;
  selectionSet: string;
}> {
  const operations: Array<{ operationType: string; selectionSet: string }> = [];
  
  // Match all query/mutation/subscription blocks
  const operationRegex = /(query|mutation|subscription)\s+(?:\w+\s*)?(?:\([^)]*\))?\s*\{/g;
  let match;
  
  while ((match = operationRegex.exec(editorQuery)) !== null) {
    const operationType = match[1];
    let pos = match.index + match[0].length;
    
    // Extract selection set by counting braces
    const selectionStart = pos;
    let braceDepth = 1;
    
    while (pos < editorQuery.length && braceDepth > 0) {
      if (editorQuery[pos] === '{') braceDepth++;
      else if (editorQuery[pos] === '}') braceDepth--;
      if (braceDepth > 0) pos++;
    }
    
    const selectionSet = editorQuery.substring(selectionStart, pos);
    operations.push({ operationType, selectionSet });
  }
  
  return operations;
}

/**
 * Extract all top-level selection sets from an operation block
 * Returns array of { name, args, selectionSet }
 */
function extractTopLevelSelections(
  operationSelectionSet: string
): Array<{ name: string; args: string; selectionSet: string }> {
  const selections: Array<{ name: string; args: string; selectionSet: string }> = [];
  let i = 0;
  
  while (i < operationSelectionSet.length) {
    // Skip whitespace and commas
    while (i < operationSelectionSet.length && /[\s\n,]/.test(operationSelectionSet[i])) {
      i++;
    }
    
    if (i >= operationSelectionSet.length) break;
    
    // Extract field name
    let fieldName = '';
    while (i < operationSelectionSet.length && !/[\s\n,({]/.test(operationSelectionSet[i])) {
      fieldName += operationSelectionSet[i];
      i++;
    }
    
    if (!fieldName) continue;
    
    // Skip whitespace
    while (i < operationSelectionSet.length && /[\s\n]/.test(operationSelectionSet[i])) {
      i++;
    }
    
    // Extract arguments if present
    let args = '';
    if (i < operationSelectionSet.length && operationSelectionSet[i] === '(') {
      let parenDepth = 1;
      i++; // Skip opening paren
      const argsStart = i;
      
      while (i < operationSelectionSet.length && parenDepth > 0) {
        if (operationSelectionSet[i] === '(') parenDepth++;
        else if (operationSelectionSet[i] === ')') parenDepth--;
        if (parenDepth > 0) i++;
      }
      
      args = operationSelectionSet.substring(argsStart, i);
      i++; // Skip closing paren
      
      // Skip whitespace after args
      while (i < operationSelectionSet.length && /[\s\n]/.test(operationSelectionSet[i])) {
        i++;
      }
    }
    
    // Extract selection set if present
    let selectionSet = '';
    if (i < operationSelectionSet.length && operationSelectionSet[i] === '{') {
      let braceDepth = 1;
      i++; // Skip opening brace
      const selectionStart = i;
      
      while (i < operationSelectionSet.length && braceDepth > 0) {
        if (operationSelectionSet[i] === '{') braceDepth++;
        else if (operationSelectionSet[i] === '}') braceDepth--;
        if (braceDepth > 0) i++;
      }
      
      selectionSet = operationSelectionSet.substring(selectionStart, i);
      i++; // Skip closing brace
    }
    
    selections.push({ name: fieldName, args, selectionSet });
  }
  
  return selections;
}

/**
 * Parse GraphQL query and extract all field selections
 */
export function parseQuerySelections(
  editorQuery: string,
  schemaOperations: Array<{ name: string; operationType: string }>
): ParsedFieldSelections {
  const newSelectedOperations = new Set<string>();
  const newOperationFieldSelections: Record<string, Set<string>> = {};
  const newOperationArgSelections: Record<string, Set<string>> = {};
  const newFieldArgSelections: Record<string, Record<string, Set<string>>> = {};
  const newNestedFieldSelections: Record<string, Record<string, Set<string>>> = {};

  // Extract all operation blocks from the query
  const operationBlocks = extractAllOperationBlocks(editorQuery);
  
  // For each operation block, extract all top-level selections
  const operationSelections = operationBlocks.map(block => ({
    operationType: block.operationType,
    selections: extractTopLevelSelections(block.selectionSet)
  }));
  
  // For each schema operation, find matching selections
  schemaOperations.forEach(schemaOp => {
    let foundInAnyBlock = false;
    let allFields = new Set<string>();
    let allOperationArgs = new Set<string>();
    let allFieldArgs: Record<string, Set<string>> = {};
    
    // Find all matching selections across all operation blocks
    operationSelections.forEach(opBlock => {
      if (opBlock.operationType !== schemaOp.operationType) return;
      
      // Find selections with matching name
      const matchingSelections = opBlock.selections.filter(
        sel => sel.name === schemaOp.name
      );
      
      if (matchingSelections.length === 0) return;
      
      foundInAnyBlock = true;
      
      // Process each matching selection
      matchingSelections.forEach(selection => {
        console.log(`Found '${schemaOp.name}' in ${schemaOp.operationType} with selection:`, selection.selectionSet.substring(0, 50));
        
        // Parse operation-level arguments
        if (selection.args) {
          const args = parseOperationArguments(selection.args);
          args.forEach(arg => allOperationArgs.add(arg));
        }
        
        // Parse selection set to get field selections
        if (selection.selectionSet) {
          const topLevelFields = parseFieldsRecursively(
            selection.selectionSet,
            schemaOp.name,
            '',
            newNestedFieldSelections,
            0
          );
          topLevelFields.forEach(field => allFields.add(field));
          
          // Parse field-level arguments
          topLevelFields.forEach(fieldName => {
            const fieldArgs = parseFieldArguments(selection.selectionSet, fieldName);
            if (fieldArgs.size > 0) {
              if (!allFieldArgs[fieldName]) {
                allFieldArgs[fieldName] = new Set();
              }
              fieldArgs.forEach(arg => allFieldArgs[fieldName].add(arg));
            }
          });
        }
      });
    });
    
    if (!foundInAnyBlock) {
      console.log(`Schema operation '${schemaOp.name}' NOT found in any ${schemaOp.operationType} block`);
      return;
    }
    
    // Mark operation as selected
    newSelectedOperations.add(schemaOp.name);
    
    // Store merged results
    newOperationFieldSelections[schemaOp.name] = allFields;
    
    if (allOperationArgs.size > 0) {
      newOperationArgSelections[schemaOp.name] = allOperationArgs;
    }
    
    if (Object.keys(allFieldArgs).length > 0) {
      newFieldArgSelections[schemaOp.name] = allFieldArgs;
    }
  });

  return {
    selectedOperations: newSelectedOperations,
    operationFieldSelections: newOperationFieldSelections,
    operationArgSelections: newOperationArgSelections,
    fieldArgSelections: newFieldArgSelections,
    nestedFieldSelections: newNestedFieldSelections
  };
}
