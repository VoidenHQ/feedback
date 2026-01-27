// ============================================================================
// Response Enhancer
// ============================================================================

import { OpenAPIValidationResult } from "./pipelineHook";

/**
 * Enhance response document with OpenAPI validation results
 */
export function enhanceResponseWithOpenAPIValidation(
  responseDoc: any,
  validationResult: OpenAPIValidationResult
): any {
  if (!responseDoc || !validationResult) {
    return responseDoc;
  }

  const validationNode = {
    type: 'openapi-validation-results',
    attrs: {
      passed: validationResult.passed,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      validatedAgainst: validationResult.validatedAgainst,
      totalErrors: validationResult.errors.length,
      totalWarnings: validationResult.warnings.length,
    },
  };

  if (!responseDoc.content) {
    responseDoc.content = [];
  }

  // Insert after assertion results (position 1 or 2)
  const insertPosition = responseDoc.content.findIndex(
    (node: any) => node.type === 'assertion-results'
  );
  
  if (insertPosition >= 0) {
    responseDoc.content.splice(insertPosition + 1, 0, validationNode);
  } else {
    responseDoc.content.splice(1, 0, validationNode);
  }

  return responseDoc;
}