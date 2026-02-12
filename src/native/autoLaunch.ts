import AutoLaunch from "auto-launch";

import { ipcMain } from "electron";

import { mainWindow } from "./window";

export const autoLaunch = new AutoLaunch({
  name: "Stoat",
});

ipcMain.handle("getAutostart", async () => {
  const enabled = await autoLaunch.isEnabled();
  return enabled;
});

ipcMain.handle("setAutostart", async (_event, state: boolean) => {
  if (state) {
    await autoLaunch.enable();
    console.log("Received new configuration autoStart: true");
  } else {
    await autoLaunch.disable();
    console.log("Received new configuration autoStart: false");
  }

  const enabled = await autoLaunch.isEnabled();
  return enabled;
});
