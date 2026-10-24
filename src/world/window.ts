import { contextBridge, ipcRenderer } from "electron";

import { version } from "../../package.json";

// stoat:// links wait in the main process until the app is ready for them,
// so a reload before then loses nothing
let onNavigate: ((path: string) => void) | undefined;
async function takeNavigation() {
  const pending: { id: number; target: string } | null =
    await ipcRenderer.invoke("takeNavigation");
  if (pending && onNavigate) {
    onNavigate(pending.target);
    ipcRenderer.send("navigationDone", pending.id);
  }
}
ipcRenderer.on("navigate", () => {
  if (onNavigate) void takeNavigation();
});

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

  onceScreenPicker: (
    onScreenPick: (
      sources: {
        idx: number;
        name: string;
        isFullScreen: boolean;
        image?: string;
      }[],
    ) => void,
  ) => {
    const eventName = "screenPicker";
    ipcRenderer.removeAllListeners(eventName);
    ipcRenderer.once(eventName, (_, sources) => onScreenPick(sources));
  },
  screenPickerCallback: (idx: number, audio: boolean) =>
    ipcRenderer.send("screenPickerCallback", idx, audio),

  isWayland: () => ipcRenderer.invoke("getIsWayland"),
  destroyVirtualMic: () => ipcRenderer.invoke("destroyVirtualMic"),

  onNavigate: (callback: (path: string) => void) => {
    onNavigate = callback;
    void takeNavigation();
  },
});
