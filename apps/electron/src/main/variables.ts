import path from "path";
import { getActiveProject, getAppState } from "./state";
import fs from "node:fs/promises";
import { ipcMain } from "electron";
import eventBus from "./eventBus";
import { windowManager } from "./windowManager";


ipcMain.handle("variables:getKeys", async () => {
    const activeProject = await getActiveProject();
    if (!activeProject) {
        return [];
    }
    let variablesData: Record<string, any> = {};
    try {
        const filePath = activeProject + '/.voiden/.process.env.json';
        const data = await fs.readFile(filePath, 'utf-8');
        variablesData = JSON.parse(data);
    } catch (error: any) {
        // Silently handle file not found - this is expected when no variables exist yet
        if (error.code !== 'ENOENT') {
            console.error("Error reading variables file:", error);
        }
        return [];
    }
    const keys = Object.keys(variablesData);
    return keys;
});

ipcMain.handle("variables:writeVariables", async (_event, content) => {
    try {
        const activeProject = await getActiveProject();
        if (!activeProject) {
            return;
        }
        const directory = path.join(activeProject, '.voiden');  
        try {
            await fs.access(directory);
        } catch (error) {
            await fs.mkdir(directory, { recursive: true });
        }
        const filePath = path.join(directory, '.process.env.json');
        await fs.writeFile(filePath, content, 'utf-8');
        windowManager.browserWindow?.webContents.send('files:tree:changed',null);
    } catch (error) {
        console.error("Error writing variables file:", error);
    }
})