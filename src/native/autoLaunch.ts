import AutoLaunch from "auto-launch";

import { ipcMain } from "electron";

import { mainWindow } from "./window";

export const autoLaunch = new AutoLaunch({
  name: "Revolt",
});

ipcMain.on("isAutostart?", () =>
  autoLaunch
    .isEnabled()
    .then((enabled) => mainWindow.webContents.send("isAutostart", enabled)),
);

ipcMain.on("setAutostart", (_event, state: boolean) => {
  if (state) {
    autoLaunch.enable();
  } else {
    autoLaunch.disable();
  }
});
