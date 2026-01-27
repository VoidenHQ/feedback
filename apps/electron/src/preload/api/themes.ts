import { ipcRenderer } from "electron";

interface ThemeMetadata {
  id: string;
  name: string;
  type: string;
}

interface Theme {
  name: string;
  type: string;
  colors: Record<string, string>;
}

export const themesApi = {
  list: (): Promise<ThemeMetadata[]> => ipcRenderer.invoke("themes:list"),
  load: (themeId: string): Promise<Theme | null> => ipcRenderer.invoke("themes:load", themeId),
  sync: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke("themes:sync"),
};
