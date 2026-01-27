/**
 * Enhance response document with assertion results
 */

/**
 * Add assertion results node to response document
 */
export function enhanceResponseWithAssertions(
  responseDoc: any,
  assertionResults: {
    results: any[];
    totalAssertions: number;
    passedAssertions: number;
    failedAssertions: number;
  }
): any {
  if (!responseDoc || !assertionResults) {
    return responseDoc;
  }

  // Create assertion results node
  const assertionResultsNode = {
    type: "assertion-results",
    attrs: {
      results: assertionResults.results,
      totalAssertions: assertionResults.totalAssertions,
      passedAssertions: assertionResults.passedAssertions,
      failedAssertions: assertionResults.failedAssertions,
    },
  };

  // Add to response document content
  if (!responseDoc.content) {
    responseDoc.content = [];
  }

  // Insert assertion results after response body (first position)
  // This will make it appear at the top of the response
  responseDoc.content.splice(1, 0, assertionResultsNode);

  return responseDoc;
}
