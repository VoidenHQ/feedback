import { replaceFakerVariables } from './fakerEngine';

/**
 * Pre-Send Hook that replaces faker variables in the request
 * This runs in Stage 5 (after env variables are replaced in Electron)
 */
export async function preSendFakerHook(context: any): Promise<void> {

  try {
    const { requestState } = context;

    // Replace in URL
    if (requestState.url) {
      const originalUrl = requestState.url;
      requestState.url = replaceFakerVariables(requestState.url);
      if (originalUrl !== requestState.url) {
      }
    }

    // Replace in headers
    if (requestState.headers) {
      requestState.headers = requestState.headers.map((header: any) => ({
        ...header,
        value: replaceFakerVariables(header.value),
      }));
    }

    // Replace in query parameters
    if (requestState.queryParams) {
      requestState.queryParams = requestState.queryParams.map((param: any) => ({
        ...param,
        value: param.value ? replaceFakerVariables(param.value) : param.value,
      }));
    }

    // Replace in path parameters
    if (requestState.pathParams) {
      requestState.pathParams = requestState.pathParams.map((param: any) => ({
        ...param,
        value: param.value ? replaceFakerVariables(param.value) : param.value,
      }));
    }

    // Replace in request body
    if (requestState.body) {
      const originalBody = requestState.body;

      // Handle both string and object bodies
      if (typeof requestState.body === 'string') {
        requestState.body = replaceFakerVariables(requestState.body);
      } else if (typeof requestState.body === 'object') {
        // Body is already parsed as JSON, stringify -> replace -> parse back
        const bodyString = JSON.stringify(requestState.body);
        const replacedString = replaceFakerVariables(bodyString);
        try {
          requestState.body = JSON.parse(replacedString);
        } catch (e) {
          // If parsing fails, keep as string
          requestState.body = replacedString;
        }
      }

      if (originalBody !== requestState.body) {
      }
    }

    // Replace in body params (for multipart/form-data and url-encoded)
    if (requestState.bodyParams) {
      requestState.bodyParams = requestState.bodyParams.map((param: any) => ({
        ...param,
        value: param.value ? replaceFakerVariables(param.value) : param.value,
      }));
    }

  } catch (error) {
  }
}
