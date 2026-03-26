import { Notification, NotificationConstructorOptions } from "electron";

import { getAppIconPngPath } from "./app-icon";
import { APP_DISPLAY_NAME } from "./branding";

export function createNotification(options: Partial<NotificationConstructorOptions>) {
    const notification = new Notification({
        title: APP_DISPLAY_NAME,
        icon: getAppIconPngPath(),
        ...(options || {}),
    });

    return notification;
}

export function createAndShowNotification(options: Partial<NotificationConstructorOptions>) {
    const notification = createNotification(options);

    notification.show();

    return notification;
}
