import { globalShortcut } from "electron";
import electronIsDev from "electron-is-dev";

import { getAppView, getWindow } from "./window";

/**
 * O BrowserView captura o foco; Ctrl+Shift+I na janela não abre DevTools do mapa.
 * Atalhos globais só em modo dev. Chamar depois de `loadShortcuts()` (faz unregisterAll).
 */
export function registerDevToolsGlobalShortcuts(): void {
    if (!electronIsDev) {
        return;
    }

    const toggle = (): void => {
        const w = getWindow();
        const av = getAppView();
        if (!w) {
            return;
        }
        const attached = av !== undefined && w.getBrowserView() === av;
        if (attached && av.webContents.isFocused()) {
            av.webContents.toggleDevTools();
        } else {
            w.webContents.toggleDevTools();
        }
    };

    const accel = process.platform === "darwin" ? "Command+Option+I" : "Control+Shift+I";
    globalShortcut.register(accel, toggle);
    globalShortcut.register("F12", toggle);
}
