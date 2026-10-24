import fs from "node:fs";
import path from "node:path";
import { IUpdateInfo, updateElectronApp } from "update-electron-app";

import { BrowserWindow, Notification, app, shell } from "electron";
import started from "electron-squirrel-startup";

import { initAutoLaunch } from "./native/autoLaunch";
import { config } from "./native/config";
import {
  findDeepLink,
  initDeepLinks,
  openDeepLink,
  registerProtocol,
} from "./native/deepLink";
import { initDiscordRpc } from "./native/discordRpc";
import { initTray } from "./native/tray";
import { destroyVirtualMic, initVirtualMic } from "./native/virtualMic";
import { BUILD_URL, createMainWindow, mainWindow } from "./native/window";

// In Flatpak, we have to update the temp dir to a shared directory across host and sandbox;
// otherwise, the icon will not show up in the tray when using app indicators.
if (process.platform === "linux" && process.env.FLATPAK_ID) {
  const runtimeDir = process.env.XDG_RUNTIME_DIR;
  if (runtimeDir) {
    try {
      const sharedTmpDir = path.join(runtimeDir, "app", process.env.FLATPAK_ID);
      fs.mkdirSync(sharedTmpDir, { recursive: true });
      process.env.TMPDIR = sharedTmpDir;
    } catch (error) {
      console.error("Failed to set up host-visible TMPDIR:", error);
    }
  }
}

// Squirrel-specific logic
// create/remove shortcuts on Windows when installing / uninstalling
// we just need to close out of the app immediately
if (started) {
  app.quit();
}

// disable hw-accel if so requested
if (!config.hardwareAcceleration) {
  app.disableHardwareAcceleration();
}

// ensure only one copy of the application can run
const acquiredLock = app.requestSingleInstanceLock();

const onNotifyUser = (_info: IUpdateInfo) => {
  const notification = new Notification({
    title: "Update Available",
    body: "Restart the app to install the update.",
    silent: true,
  });

  notification.show();
};

if (acquiredLock) {
  // start auto update logic
  updateElectronApp({ onNotifyUser });

  // facilitate stoat:// links
  registerProtocol();

  // necessary macOS glue
  let pendingDeepLink = findDeepLink(process.argv);
  app.on("open-url", (event, url) => {
    event.preventDefault();
    // openDeepLink recreates the window if macOS closed it
    if (app.isReady()) {
      openDeepLink(url);
    } else {
      pendingDeepLink = url;
    }
  });

  // create and configure the app when electron is ready
  app.on("ready", () => {
    // create window and application contexts
    initDeepLinks();
    createMainWindow();

    // save first launch state
    if (config.firstLaunch) {
      // Doesn't do anything right now. Used to enable auto start, but that behaviour was removed.
      // Left in case it gets used in the future.
      config.firstLaunch = false;
    }

    initTray();
    initDiscordRpc();
    initVirtualMic();
    initAutoLaunch();

    // follow the link the app was started with; after the tray exists, as
    // showing the window updates the tray menu
    if (pendingDeepLink) {
      openDeepLink(pendingDeepLink);
      pendingDeepLink = undefined;
    }

    // Windows specific fix for notifications
    if (process.platform === "win32") {
      app.setAppUserModelId("chat.stoat.notifications");
    }
  });

  // Focus the window if we try to launch again, following any stoat:// link
  // it was launched with (Windows and Linux)
  app.on("second-instance", (_event, argv) => {
    const link = findDeepLink(argv);
    if (link) {
      openDeepLink(link);
      return;
    }

    mainWindow.show();
    mainWindow.restore();
    mainWindow.focus();
  });

  // macOS specific behaviour to keep app active in dock:
  // (irrespective of the minimise-to-tray option)

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // ensure URLs launch in external context
  app.on("web-contents-created", (_, contents) => {
    // prevent navigation out of build URL origin
    contents.on("will-navigate", (event, navigationUrl) => {
      if (new URL(navigationUrl).origin !== BUILD_URL.origin) {
        event.preventDefault();
      }
    });

    // handle links externally
    contents.setWindowOpenHandler(({ url }) => {
      if (
        url.startsWith("http:") ||
        url.startsWith("https:") ||
        url.startsWith("mailto:")
      ) {
        setImmediate(() => {
          shell.openExternal(url);
        });
      }

      return { action: "deny" };
    });
  });

  let readyToQuit = false;
  app.on("will-quit", (e) => {
    if (readyToQuit) return;
    e.preventDefault();
    destroyVirtualMic().finally(() => {
      readyToQuit = true;
      app.quit();
    });
  });
} else {
  app.quit();
}
