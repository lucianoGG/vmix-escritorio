import { app, dialog } from "electron";
import electronIsDev from "electron-is-dev";
import log from "electron-log";
import { autoUpdater } from "electron-updater";
import type { UpdateDownloadedEvent } from "electron-updater";
import * as util from "util";

import { APP_DISPLAY_NAME } from "./branding";
import { createAndShowNotification } from "./notification";

const sleep = util.promisify(setTimeout);

let isCheckPending = false;
let isManualRequestedUpdate = false;

export async function checkForUpdates() {
    if (isCheckPending) {
        return;
    }

    if (electronIsDev) {
        return;
    }

    isCheckPending = true;
    try {
        await autoUpdater.checkForUpdates();
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("No published versions") || msg.includes("ENOENT")) {
            log.debug("[vmix] Sem releases publicados no GitHub; ignorando verificação de atualizações.");
            return;
        }
        log.warn("[vmix] Erro ao verificar atualizações:", err);
    } finally {
        isCheckPending = false;
    }
}

export async function manualRequestUpdateCheck() {
    isManualRequestedUpdate = true;

    createAndShowNotification({
        body: "Verificando atualizações ...",
    });

    await checkForUpdates();
    isManualRequestedUpdate = false;
}

async function init() {
    autoUpdater.logger = log;

    autoUpdater.on("update-downloaded", (info: UpdateDownloadedEvent) => {
        void (async () => {
            const notesText =
                typeof info.releaseNotes === "string"
                    ? info.releaseNotes
                    : Array.isArray(info.releaseNotes)
                        ? info.releaseNotes
                            .map((n) => (typeof n === "string" ? n : `${n.version}: ${n.note ?? ""}`))
                            .join("\n")
                        : "";
            const dialogOpts = {
                type: "question" as const,
                buttons: ["Instalar e reiniciar", "Instalar depois"],
                defaultId: 0,
                title: `${APP_DISPLAY_NAME} — Atualização`,
                message: notesText || info.releaseName || `Versão ${info.version}`,
                detail: "Uma nova versão foi descarregada. Reinicie a aplicação para aplicar a atualização.",
            };

            const { response } = await dialog.showMessageBox(dialogOpts);
            if (response === 0) {
                await sleep(1000);
                autoUpdater.quitAndInstall();
                app.quit();
            }
        })();
    });

    if (process.platform === "linux" && !process.env.APPIMAGE) {
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = false;

        autoUpdater.on("update-available", () => {
            createAndShowNotification({
                title: `${APP_DISPLAY_NAME} - Atualização disponível`,
                body: "Por favor, acesse nosso site e instale a versão mais recente",
            });
        });
    }

    autoUpdater.on("update-not-available", () => {
        if (isManualRequestedUpdate) {
            createAndShowNotification({
                body: "Nenhuma atualização disponível.",
            });
        }
    });

    await checkForUpdates();

    setInterval(() => {
        void checkForUpdates();
    }, 1000 * 60 * 60);
}

export default {
    init,
};
