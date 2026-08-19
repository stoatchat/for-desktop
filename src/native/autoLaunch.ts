import AutoLaunch from "auto-launch";

import { ipcMain } from "electron";

export const autoLaunch = new AutoLaunch({
  name: "Stoat",
});

/**
 * Register the auto launch IPC handlers.
 *
 * These used to be registered as an import side effect, which meant they were
 * silently dropped once the last direct use of `autoLaunch` disappeared and
 * linting removed the then-unused import. Requiring an explicit call keeps the
 * handlers tied to something the linter cannot quietly delete.
 */
export function initAutoLaunch() {
  ipcMain.handle("getAutostart", () => autoLaunch.isEnabled());

  ipcMain.handle("setAutostart", async (_event, state: boolean) => {
    if (state) {
      await autoLaunch.enable();
    } else {
      await autoLaunch.disable();
    }

    console.log(`Received new configuration autoStart: ${state}`);

    return autoLaunch.isEnabled();
  });
}
