import { Menu, Tray, nativeImage } from "electron";

import trayIconAsset from "../../assets/desktop/icon.png?asset";
import macOsTrayIconAsset from "../../assets/desktop/iconTemplate.png?asset";
import { version } from "../../package.json";

import { mainWindow, quitApp } from "./window";

// internal tray state
let tray: Tray = null;

// Create and resize tray icon for macOS
function createTrayIcon() {
  if (process.platform === "darwin") {
    const image = nativeImage.createFromDataURL(macOsTrayIconAsset);
    const resized = image.resize({ width: 20, height: 20 });
    resized.setTemplateImage(true);
    return resized;
  } else {
    return nativeImage.createFromDataURL(trayIconAsset);
  }
}

// Electron 39 (wayland support) and zypak broke this old code for tray icon support.
// I don't know why, but this code is never ran in the flatpak. Code copied from
// electron/lib/browser/init.ts
function setXDGDesktop() {
  // Only matters on linux
  if (process.platform !== "linux") return;
  // If XDG_CURRENT_DESKTOP is Unity this code has probably already run and we're not
  // in a flatpak.
  if (process.env.XDG_CURRENT_DESKTOP == "Unity") return;
  const KNOWN_XDG_DESKTOP_VALUES = ["Pantheon", "Unity:Unity7", "pop:GNOME"];
  const currentPlatformSupportsAppIndicator = () => {
    const currentDesktop = process.env.XDG_CURRENT_DESKTOP;

    if (!currentDesktop) return false;
    if (KNOWN_XDG_DESKTOP_VALUES.includes(currentDesktop)) return true;
    // ubuntu based or derived session (default ubuntu one, communitheme…) supports
    // indicator too.
    if (/ubuntu/gi.test(currentDesktop)) return true;

    return false;
  };

  // Workaround for electron/electron#5050 and electron/electron#9046
  process.env.ORIGINAL_XDG_CURRENT_DESKTOP = process.env.XDG_CURRENT_DESKTOP;
  if (currentPlatformSupportsAppIndicator()) {
    process.env.XDG_CURRENT_DESKTOP = "Unity";
  }
}

export function initTray() {
  setXDGDesktop();
  const trayIcon = createTrayIcon();
  tray = new Tray(trayIcon);
  updateTrayMenu();
  tray.setToolTip("Stoat for Desktop");
  tray.setImage(trayIcon);
  tray.on("click", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  tray.setImage(trayIcon);
}

export function updateTrayMenu() {
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Stoat for Desktop", type: "normal", enabled: false },
      {
        label: "Version",
        type: "submenu",
        submenu: Menu.buildFromTemplate([
          {
            label: version,
            type: "normal",
            enabled: false,
          },
        ]),
      },
      { type: "separator" },
      {
        label: mainWindow.isVisible() ? "Hide App" : "Show App",
        type: "normal",
        click() {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
          }
        },
      },
      {
        label: "Quit App",
        type: "normal",
        click: quitApp,
      },
    ]),
  );
}
