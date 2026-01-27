/**
 * Error Message Mapping for HTTP/REST Requests
 *
 * Maps network errors to user-friendly messages
 */

/**
 * Map of API client error codes to user-friendly messages
 */
export const apiClientErrors = new Map([
  ["ECONNREFUSED", "Connection refused by the server."],
  ["ECONNRESET", "Connection reset by the server."],
  ["ETIMEDOUT", "Connection timed out."],
  ["ENOTFOUND", "Could not resolve the domain name. Check your URL."],
  ["ENETUNREACH", "Network is unreachable. Check your internet connection."],
  ["ECONNABORTED", "Connection was aborted."],
  ["EHOSTUNREACH", "Host is unreachable."],
  ["EPIPE", "Connection was broken (broken pipe)."],
  ["EAI_AGAIN", "DNS lookup timed out. Try again."],
  ["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "SSL certificate verification failed."],
  ["SELF_SIGNED_CERT_IN_CHAIN", "SSL certificate is self-signed."],
  ["CERT_HAS_EXPIRED", "SSL certificate has expired."],
  ["CERT_NOT_YET_VALID", "SSL certificate is not yet valid."],
  ["DEPTH_ZERO_SELF_SIGNED_CERT", "Self-signed certificate detected."],
  ["ERR_TLS_CERT_ALTNAME_INVALID", "SSL certificate hostname mismatch."],
  ["ERR_SSL_WRONG_VERSION_NUMBER", "SSL/TLS version mismatch."],
  ["ERR_BAD_REQUEST", "The request was malformed or invalid."],
  ["ERR_INVALID_URL", "The URL is invalid or malformed."],
  ["ERR_INVALID_PROTOCOL", "Invalid protocol specified in URL."],
  ["ERR_STREAM_PREMATURE_CLOSE", "Stream closed unexpectedly."],
  ["ERR_CONTENT_DECODING_FAILED", "Failed to decode response content (check encoding)."],
  ["ERR_INVALID_CONTENT_LENGTH", "Invalid Content-Length header."],
  ["ERR_CONTENT_LENGTH_MISMATCH", "The content length did not match the expected amount."],
]);

/**
 * Humorous/friendly error messages shown to users
 */
export const friendlyErrorMessages = [
  "Hmm... we couldn't reach the API. Double-check the URL, method, or your network connection. (Did you unplug the internet again?)",
  "Unable to reach the API endpoint. Check your URL, method, or network connection — or maybe the server just needed a nap.",
  "Oops! We couldn't connect. Verify your URL and network settings — unless you're testing in airplane mode?",
  "The request didn't go through. Please check your endpoint URL, HTTP method, and network connection.",
  "We hit a snag trying to reach the server. Double-check your URL, method, and connection — the internet can be finicky sometimes.",
  "Looks like we can't reach that server. Is the URL correct? Is your network working? Is the server even awake?",
  "Connection failed! Make sure the URL is right, your method is correct, and your Wi-Fi isn't just pretending to work.",
  "No response from the server. Check the URL, your internet connection, and whether the server is having a bad day.",
  "Request failed to complete. Verify your endpoint, method, and network — technology can be unpredictable!",
  "Something went wrong reaching the API. Double-check everything: URL, method, network... maybe even your coffee levels.",
];

/**
 * Get a random friendly error message
 */
export function getRandomErrorMessage(): string {
  return friendlyErrorMessages[Math.floor(Math.random() * friendlyErrorMessages.length)];
}

/**
 * Map an error to a user-friendly message
 *
 * @param error - The error object or string
 * @returns A user-friendly error message
 */
export function mapErrorToMessage(error: any): string {
  // If it's a string, return it directly
  if (typeof error === 'string') {
    return error;
  }

  // Extract error code and message
  const errorCode = error?.code || error?.errno || '';
  const errorMessage = error?.message || String(error);

  // Check if we have a known error code
  if (errorCode && apiClientErrors.has(errorCode)) {
    const knownError = apiClientErrors.get(errorCode)!;
    return `${knownError}\n\n${getRandomErrorMessage()}`;
  }

  // Check if error message contains a known error code
  for (const [code, message] of apiClientErrors.entries()) {
    if (errorMessage.includes(code)) {
      return `${message}\n\n${getRandomErrorMessage()}`;
    }
  }

  // HTTP status code errors
  if (error?.response?.status) {
    const status = error.response.status;
    if (status >= 400 && status < 500) {
      return `Client error (${status}): ${error.response.statusText || 'Bad Request'}\n\nCheck your request parameters, headers, and authentication.`;
    }
    if (status >= 500) {
      return `Server error (${status}): ${error.response.statusText || 'Internal Server Error'}\n\nThe server encountered an error. Try again later.`;
    }
  }

  // Abort/cancellation
  if (error?.name === 'AbortError' || errorMessage.includes('abort')) {
    return 'Request was cancelled.';
  }

  // Generic network errors
  if (errorMessage.toLowerCase().includes('network') ||
      errorMessage.toLowerCase().includes('fetch') ||
      errorMessage.toLowerCase().includes('connection')) {
    return `Network error: ${errorMessage}\n\n${getRandomErrorMessage()}`;
  }

  // Timeout errors
  if (errorMessage.toLowerCase().includes('timeout')) {
    return `Request timed out.\n\nThe server took too long to respond. Check your connection or try again.`;
  }

  // SSL/TLS errors
  if (errorMessage.toLowerCase().includes('ssl') ||
      errorMessage.toLowerCase().includes('tls') ||
      errorMessage.toLowerCase().includes('certificate')) {
    return `SSL/TLS error: ${errorMessage}\n\nThere's an issue with the server's security certificate.`;
  }

  // Default fallback - return original error with a friendly message
  return `${errorMessage}\n\n${getRandomErrorMessage()}`;
}

/**
 * Format error for display with title and details
 *
 * @param error - The error object or string
 * @returns Formatted error object with title and message
 */
export function formatErrorForDisplay(error: any): { title: string; message: string } {
  const mappedMessage = mapErrorToMessage(error);

  // Split on double newline to separate technical message from friendly message
  const parts = mappedMessage.split('\n\n');

  if (parts.length > 1) {
    return {
      title: 'Request Failed',
      message: mappedMessage,
    };
  }

  return {
    title: 'Request Failed',
    message: mappedMessage,
  };
}
