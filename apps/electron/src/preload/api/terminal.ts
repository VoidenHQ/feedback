import { ipcRenderer } from "electron";

export const terminalApi = {
  attachOrCreate: (params: { tabId: string; cwd: string; cols?: number; rows?: number }) => ipcRenderer.invoke("terminal:attachOrCreate", params),
  sendInput: (data: { id: string; data: string }) => {
    ipcRenderer.send("terminal:sendInput", data);
  },
  resize: (data: { id: string; cols: number; rows: number }) => {
    ipcRenderer.send("terminal:resize", data);
  },
  onOutput: (id: string, callback: (data: string) => void) => {
    ipcRenderer.on(`terminal:output:${id}`, (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners(`terminal:output:${id}`);
  },
  onExit: (id: string, callback: (exitInfo: { exitCode: number; signal: number }) => void) => {
    ipcRenderer.on(`terminal:exit:${id}`, (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners(`terminal:exit:${id}`);
  },
  detach: (id: string) => {
    ipcRenderer.send("terminal:detach", id);
  },
  new: (panelId: string) => ipcRenderer.invoke("terminal:new", panelId),
};
