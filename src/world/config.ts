import { contextBridge, ipcRenderer } from "electron";

let config: DesktopConfig;

ipcRenderer.on("config", (_, data) => (config = data));

contextBridge.exposeInMainWorld("desktopConfig", {
  get: () => config,
  set: (config: DesktopConfig) => ipcRenderer.send("config", config),
  getAutostart() {
    ipcRenderer.send("isAutostart?");
    return new Promise((resolve) => ipcRenderer.once("isAutostart", resolve));
  },
  setAutostart(value: boolean) {
    ipcRenderer.send("setAutostart", value);
  },
  setHomeserver(value: string) {
    ipcRenderer.send("updateHomeserver", value);
  }
});
