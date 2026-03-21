import { globalShortcut } from "electron";

import { registerDevToolsGlobalShortcuts } from "./devtools";
import { emitCameraToggle, emitMuteToggle } from "./ipc";
import settings, { SettingsData } from "./settings";

export function setShortcutsEnabled(enabled: boolean) {
    if (enabled) {
        loadShortcuts();
    } else {
        globalShortcut.unregisterAll();
    }
}

export function loadShortcuts() {
    globalShortcut.unregisterAll();

    const shortcuts = settings.get("shortcuts");

    if (shortcuts?.mute_toggle && shortcuts.mute_toggle.length > 0) {
        globalShortcut.register(shortcuts.mute_toggle, () => {
            emitMuteToggle();
        });
    }

    if (shortcuts?.camera_toggle && shortcuts.camera_toggle.length > 0) {
        globalShortcut.register(shortcuts.camera_toggle, () => {
            emitCameraToggle();
        });
    }

    registerDevToolsGlobalShortcuts();
}

export function saveShortcut(shortcut: keyof SettingsData["shortcuts"], key: string) {
    const shortcuts = settings.get("shortcuts") || <SettingsData["shortcuts"]>{};
    shortcuts[shortcut] = key;
    settings.set("shortcuts", shortcuts);
    loadShortcuts();
}
