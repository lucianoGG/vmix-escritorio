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

function injectDesktopScrollbarStyles(): void {
    const id = "vmix-desktop-scrollbar-styles";
    if (document.getElementById(id)) {
        return;
    }
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
        html {
            scrollbar-gutter: stable;
        }
        *::-webkit-scrollbar {
            -webkit-appearance: none;
            width: 10px;
            height: 10px;
        }
        *::-webkit-scrollbar-thumb {
            min-height: 24px;
            border-radius: 8px;
            border: 2px solid transparent;
            background-clip: padding-box;
            background-color: rgba(127, 127, 127, 0.55);
        }
        *::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.12);
        }
        #map-editor-right .overflow-auto {
            min-height: 0 !important;
        }
    `;
    document.documentElement.appendChild(style);
}

// Sobrescreve getDisplayMedia antes do WorkAdventure carregar
window.addEventListener("DOMContentLoaded", () => {
    injectDesktopScrollbarStyles();
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