import path from "path";
import { getActiveProject } from "./state";
import fs from "node:fs/promises";
import { ipcMain } from "electron";
import { windowManager } from "./windowManager";

async function getVariablesFilePath(): Promise<string | null> {
    const activeProject = await getActiveProject();
    if (!activeProject) return null;
    const directory = path.join(activeProject, '.voiden');
    try {
        await fs.access(directory);
    } catch {
        await fs.mkdir(directory, { recursive: true });
    }
    return path.join(directory, '.process.env.json');
}

async function readVariablesObject(): Promise<Record<string, any>> {
    const filePath = await getVariablesFilePath();
    if (!filePath) return {};
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(data);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error: any) {
        if (error.code !== 'ENOENT') {
            console.error("Error reading variables file:", error);
        }
        return {};
    }
}

async function writeVariablesObject(content: Record<string, any>): Promise<void> {
    const filePath = await getVariablesFilePath();
    if (!filePath) return;
    await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');
    windowManager.browserWindow?.webContents.send('files:tree:changed', null);
}

ipcMain.handle("variables:getKeys", async () => {
    const variablesData = await readVariablesObject();
    const keys = Object.keys(variablesData);
    return keys;
});

ipcMain.handle("variables:read", async () => {
    return await readVariablesObject();
});

ipcMain.handle("variables:get", async (_event, key: string) => {
    const data = await readVariablesObject();
    return data[key];
});

ipcMain.handle("variables:set", async (_event, key: string, value: any) => {
    const data = await readVariablesObject();
    data[key] = value;
    await writeVariablesObject(data);
    return true;
});

ipcMain.handle("variables:writeVariables", async (_event, content: string | Record<string, any>) => {
    try {
        let parsedContent: Record<string, any>;
        if (typeof content === 'string') {
            parsedContent = JSON.parse(content || '{}');
        } else {
            parsedContent = content || {};
        }
        await writeVariablesObject(parsedContent);
    } catch (error) {
        console.error("Error writing variables file:", error);
    }
})
