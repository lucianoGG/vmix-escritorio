import { contextBridge, ipcRenderer } from "electron";
import type { WorkAdventureDesktopApi } from "./types";

const api: WorkAdventureDesktopApi = {
    desktop: true,
    isDevelopment: () => ipcRenderer.invoke("is-development"),
    getVersion: () => ipcRenderer.invoke("get-version"),
    notify: (txt) => ipcRenderer.send("app:notify", txt),
    onMuteToggle: (callback) => ipcRenderer.on("app:on-mute-toggle", callback),
    onCameraToggle: (callback) => ipcRenderer.on("app:on-camera-toggle", callback),
    getDesktopCapturerSources: (options) =>
        ipcRenderer.invoke("app:getDesktopCapturerSources", options),
    selectDesktopSource: () => ipcRenderer.invoke("app:selectDesktopSource"),
};

contextBridge.exposeInMainWorld("WAD", api);

// Sobrescreve getDisplayMedia antes do WorkAdventure carregar
window.addEventListener("DOMContentLoaded", () => {
    const script = document.createElement("script");
    script.textContent = `
        (function () {
            const _original = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);

            navigator.mediaDevices.getDisplayMedia = async function (constraints) {
                // Abre o picker nativo e aguarda o usuário escolher
                const sourceId = await window.WAD.selectDesktopSource();

                if (!sourceId) {
                    throw new DOMException("User cancelled", "AbortError");
                }

                return navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        mandatory: {
                            chromeMediaSource: "desktop",
                            chromeMediaSourceId: sourceId,
                            minWidth: 1280,
                            maxWidth: 4096,
                            minHeight: 720,
                            maxHeight: 2160,
                        },
                    },
                });
            };
        })();
    `;
    document.head.prepend(script);
});