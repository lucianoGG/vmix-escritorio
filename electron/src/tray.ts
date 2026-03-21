import { app, Tray, Menu } from "electron";
import path from "path";
import { showAboutWindow } from "electron-util";

import * as autoUpdater from "./auto-updater";
import { APP_DISPLAY_NAME } from "./branding";
import * as log from "./log";
import { confirmQuit, getAppView, getWindow } from "./window";

let tray: Tray | undefined;

const assetsDirectory = path.join(__dirname, "..", "assets");

export function getTray() {
    return tray;
}

export function createTray() {
    tray = new Tray(path.join(assetsDirectory, "icons", "logo.png"));
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
            label: "Abrir DevTools",
            click() {
                getWindow()?.webContents.openDevTools({ mode: "detach" });
                getAppView()?.webContents.openDevTools({ mode: "detach" });
            },
        },
        {
            label: "Sobre",
            click() {
                showAboutWindow({
                    icon: path.join(assetsDirectory, "icons", "logo.png"),
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
