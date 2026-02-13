import { Menu, Tray, nativeImage } from "electron";

import trayIconAsset from "../../assets/desktop/iconTemplate.png?asset";
import { version } from "../../package.json";

import { mainWindow, quitApp } from "./window";

// internal tray state
let tray: Tray = null;

// Create and resize tray icon for macOS
function createTrayIcon() {
  const image = nativeImage.createFromDataURL(trayIconAsset);
  console.log("Tray icon asset type:", typeof trayIconAsset);
  console.log("Tray icon asset preview:", String(trayIconAsset).slice(0, 50));
  const resized = image.resize({ width: 20, height: 20 });

  // Mark as template image so it adapts to dark/light mode
  resized.setTemplateImage(true);

  return resized;
}

// trayIcon.setTemplateImage(true);

export function initTray() {
  const trayIcon = createTrayIcon();
  tray = new Tray(trayIcon);
  updateTrayMenu();
  tray.setToolTip("Stoat for Desktop");
  tray.setImage(trayIcon);
  tray.on("click", () => {
    mainWindow.show();
    mainWindow.focus();
  });
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
