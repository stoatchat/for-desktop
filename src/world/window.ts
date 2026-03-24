import { contextBridge, ipcRenderer } from "electron";

import { version } from "../../package.json";

contextBridge.exposeInMainWorld("native", {
  versions: {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
    desktop: () => version,
  },

  minimise: () => ipcRenderer.send("minimise"),
  maximise: () => ipcRenderer.send("maximise"),
  close: () => ipcRenderer.send("close"),

  setBadgeCount: (count: number) => ipcRenderer.send("setBadgeCount", count),

  navigate: (url: string) =>
    ipcRenderer.invoke("navigate", url) as Promise<boolean>,

  getServerUrl: () =>
    ipcRenderer.invoke("getServerUrl") as Promise<string>,

  showServerPicker: () => ipcRenderer.invoke("showServerPicker") as Promise<void>,
});
