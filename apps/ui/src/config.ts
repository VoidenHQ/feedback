const isElectron = !!window.electron?.isApp;
export const isLocalDevelopment = import.meta.env.DEV;

const getBackendHost = () => {
  return import.meta.env.VITE_BACKEND_HOST || (isLocalDevelopment ? "localhost:8081" : window.location.host);
};

export const getBasePath = (): "" | "/voiden-wrapper" => "";

export const getBaseUrl = () => {
  const url = `${HTTP_PROTOCOL}://${getBackendHost()}${getBasePath()}`;
  return url;
};
export const getWebsocketBackendUrl = () => `${WEBSOCKET_PROTOCOL}://${getBackendHost()}/voiden/api`;
export const getBackendUrl = () => `${HTTP_PROTOCOL}://${getBackendHost()}/voiden/api`;

export const getApyhubUrl = () => {
  if (isElectron) {
    if (isLocalDevelopment) {
      return `${HTTP_PROTOCOL}://localhost:3000`;
    } else {
      return import.meta.env.VITE_APYHUB_URL;
    }
  } else {
    return `${HTTP_PROTOCOL}://${window.location.host}`;
  }
};

const WEBSOCKET_PROTOCOL = isLocalDevelopment ? "ws" : "wss";
const HTTP_PROTOCOL = isLocalDevelopment ? "http" : "https";
