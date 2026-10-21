import { NativeImage, app, ipcMain, nativeImage } from "electron";

import { mainWindow } from "./window";

// internal state
const nativeIcons: Record<number, NativeImage> = {};

export async function setBadgeCount(count: number) {
  switch (process.platform) {
    case "win32":
      if (count === 0) {
        mainWindow.setOverlayIcon(null, "No Notifications");
        break;
      }

      const iconIndex = Math.min(count, 10);

      if (!nativeIcons[iconIndex]) {
        const asset = await import(`../../assets/desktop/badges/${iconIndex}.ico`);
        nativeIcons[iconIndex] = nativeImage.createFromDataURL(asset.default);
      }

      mainWindow.setOverlayIcon(
        nativeIcons[iconIndex],
        count === -1 ? `Unread Messages` : `${count} Notifications`,
      );

      break;
    default:
      app.setBadgeCount(count);

      break;
  }
}

export function initBadges() {
  ipcMain.on("setBadgeCount", (_event, count: number) => setBadgeCount(count));
}
