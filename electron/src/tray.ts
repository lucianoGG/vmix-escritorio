import { app, Tray, Menu } from "electron";
import { showAboutWindow } from "electron-util";

import * as autoUpdater from "./auto-updater";
import { APP_DISPLAY_NAME } from "./branding";
import { getAppIconPngPath } from "./app-icon";
import * as log from "./log";
import { confirmQuit, getAppView, getWindow } from "./window";

let tray: Tray | undefined;

export function getTray() {
    return tray;
}

export function createTray() {
    tray = new Tray(getAppIconPngPath());
    tray.setToolTip(APP_DISPLAY_NAME);

    const trayContextMenu = Menu.buildFromTemplate([
        {
            id: "open",
            label: "Mostrar / ocultar",
            click() {
                const mainWindow = getWindow();
                if (!mainWindow) {
                    throw new Error("Main window not found");
                }

                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.show();
                }
            },
        },
        {
            label: "Verificar atualizações",
            click() {
                void autoUpdater.manualRequestUpdateCheck();
            },
        },
        {
            label: "Abrir logs",
            click() {
                void log.openLog();
            },
        },
        {
            label: "DevTools",
            submenu: [
                {
                    label: "Interface (sidebar)",
                    click() {
                        getWindow()?.webContents.openDevTools({ mode: "detach" });
                    },
                },
                {
                    label: "Mapa (WorkAdventure)",
                    click() {
                        getAppView()?.webContents.openDevTools({ mode: "detach" });
                    },
                },
            ],
        },
        {
            label: "Sobre",
            click() {
                showAboutWindow({
                    icon: getAppIconPngPath(),
                    copyright: `Copyright © ${APP_DISPLAY_NAME}`,
                });
            },
        },
        {
            label: "Sair",
            click() {
                confirmQuit();
                app.quit();
            },
        },
    ]);

    tray.setContextMenu(trayContextMenu);

    tray.on("double-click", () => {
        const mainWindow = getWindow();
        if (!mainWindow) {
            throw new Error("Main window not found");
        }

        mainWindow.show();
    });
}
