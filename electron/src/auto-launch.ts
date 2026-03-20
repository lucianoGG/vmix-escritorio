import AutoLaunch from "auto-launch";
import { app } from "electron";
import electronIsDev from "electron-is-dev";

import { APP_DISPLAY_NAME } from "./branding";
import settings from "./settings";

export async function updateAutoLaunch() {
    const isAutoLaunchEnabled = settings.get("auto_launch_enabled");

    // Don't run this in development
    if (electronIsDev) {
        return;
    }

    // `setLoginItemSettings` doesn't support linux
    if (process.platform === "linux") {
        const autoLauncher = new AutoLaunch({
            name: APP_DISPLAY_NAME,
            isHidden: true,
        });

        if (isAutoLaunchEnabled) {
            await autoLauncher.enable();
        } else {
            await autoLauncher.disable();
        }

        return;
    }

    app.setLoginItemSettings({
        openAtLogin: isAutoLaunchEnabled,
        openAsHidden: true,
    });
}
