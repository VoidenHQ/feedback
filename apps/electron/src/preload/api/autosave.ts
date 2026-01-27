import { ipcRenderer } from "electron";

export const autosaveApi = {
  save: (tabId: string, content: string) => ipcRenderer.invoke("autosave:save", tabId, content),
  load: (tabId: string) => ipcRenderer.invoke("autosave:load", tabId),
  delete: (tabId: string) => ipcRenderer.invoke("autosave:delete", tabId),
};
