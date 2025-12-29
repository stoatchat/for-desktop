import dbus from "@homebridge/dbus-native";

import { NativeImage, app, ipcMain, nativeImage } from "electron";

import { mainWindow } from "./window";

// internal state
const nativeIcons: Record<number, NativeImage> = {};
let sessionBus: dbus.MessageBus | null;

export async function setBadgeCount(count: number) {
  switch (process.platform) {
    case "win32":
    case "linux":
      if (count === 0) {
        mainWindow.setOverlayIcon(null, "No Notifications");
        break;
      }

      if (!nativeIcons[count])
        nativeIcons[count] = nativeImage.createFromDataURL(
          await import(
            `../../assets/desktop/badges/${Math.min(count, 10)}.ico?asset`
          ).then((asset) => asset.default),
        );

      mainWindow.setOverlayIcon(
        nativeIcons[count],
        count === -1 ? `Unread Messages` : `${count} Notifications`,
      );

      break;
    // @ts-expect-error this is `linux` block
    case "_": // todo: try to get this to work
      // send D-Bus message
      // @ts-expect-error undocumented API
      if (!sessionBus) sessionBus = dbus.sessionBus();

      // @ts-expect-error undocumented API
      sessionBus.connection.message({
        // @ts-expect-error undocumented API
        type: dbus.messageType.signal,
        serial: 1,
        path: "/",
        interface: "com.canonical.Unity.LauncherEntry",
        member: "Update",
        signature: "sa{sv}",
        body: [
          process.env.container === "1"
            ? "application://chat.stoat.stoat-desktop.desktop" // flatpak handling
            : "application://stoat-desktop.desktop",
          [
            ["count", ["x", Math.min(count, 0)]],
            ["count-visible", ["b", count !== 0]],
          ],
        ],
      });

      break;
    case "darwin":
      app.dock.setBadge(
        count === -1 ? "•" : count === 0 ? "" : count.toString(),
      );

      break;
  }
}

ipcMain.on("setBadgeCount", (_event, count: number) => setBadgeCount(count));
