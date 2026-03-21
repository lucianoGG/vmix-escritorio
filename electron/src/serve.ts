import { app, BrowserWindow } from "electron";
import serve from "electron-serve";
import path from "path";

/** Em dev, `__dirname` é `electron/dist`; o build do Vite está em `../local-app/dist`. No instalador, `local-app/dist` fica ao lado de `dist/`. */
function localAppDistDirectory(): string {
    if (app.isPackaged) {
        return path.resolve(__dirname, "..", "local-app", "dist");
    }
    return path.resolve(__dirname, "..", "..", "local-app", "dist");
}

const customScheme = serve({ directory: localAppDistDirectory() });

export async function loadCustomScheme(window: BrowserWindow) {
    await customScheme(window);
}
