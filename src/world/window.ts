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

  // Wrapped in braces to return void
  onceScreenPicker: (
    onScreenPick: (
      sources: { idx: number; name: string }[],
      callback: (idx: number, audio: boolean) => void,
    ) => void,
  ) => {
    ipcRenderer.once("screenPicker", (_, sources, callback) =>
      onScreenPick(sources, callback),
    );
  },
});
