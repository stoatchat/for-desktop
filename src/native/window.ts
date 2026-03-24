import { join } from "node:path";

import {
  BrowserWindow,
  Menu,
  MenuItem,
  app,
  ipcMain,
  nativeImage,
} from "electron";

import windowIconAsset from "../../assets/desktop/icon.png?asset";

import { config } from "./config";
import { updateTrayMenu } from "./tray";

// injected by Electron Forge Vite plugin
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

export const DEFAULT_SERVER = "https://beta.revolt.chat";

// global reference to main window
export let mainWindow: BrowserWindow;

// currently in-use server URL — initialized inside createMainWindow() to avoid
// the circular config ↔ window import being evaluated before both modules are ready
let _buildUrl: URL;

export function getBuildURL(): URL {
  return _buildUrl;
}

// internal window state
let shouldQuit = false;

// load the window icon
const windowIcon = nativeImage.createFromDataURL(windowIconAsset);

/**
 * Load the local server-picker renderer page
 */
export function loadServerPicker(win: BrowserWindow = mainWindow) {
  if (
    typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== "undefined" &&
    MAIN_WINDOW_VITE_DEV_SERVER_URL
  ) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(
      join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
}

/**
 * Inject a floating "Switch Server" button into the currently-loaded chat page.
 * executeJavaScript bypasses the remote site's CSP, so no external assets are needed.
 */
function injectSwitchServerButton() {
  mainWindow.webContents.executeJavaScript(`
    (function () {
      if (document.getElementById('__stoat-switch-btn')) return;

      const btn = document.createElement('button');
      btn.id = '__stoat-switch-btn';
      btn.title = 'Switch Server (Ctrl+Shift+S)';
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/></svg><span>Switch Server</span>';

      Object.assign(btn.style, {
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: '2147483647',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px 6px 9px',
        background: 'rgba(20,20,26,0.82)',
        color: '#ccc',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '20px',
        fontSize: '12px',
        fontFamily: '-apple-system,system-ui,sans-serif',
        fontWeight: '500',
        cursor: 'pointer',
        backdropFilter: 'blur(10px)',
        opacity: '0.35',
        transition: 'opacity 0.18s, background 0.18s, color 0.18s',
        userSelect: 'none',
        lineHeight: '1',
      });

      btn.onmouseenter = () => {
        btn.style.opacity = '1';
        btn.style.background = 'rgba(88,101,242,0.92)';
        btn.style.color = '#fff';
      };
      btn.onmouseleave = () => {
        btn.style.opacity = '0.35';
        btn.style.background = 'rgba(20,20,26,0.82)';
        btn.style.color = '#ccc';
      };

      btn.onclick = () => window.native?.showServerPicker?.();

      document.body.appendChild(btn);
    })();
  `);
}

/**
 * Create the main application window
 */
export function createMainWindow() {
  // resolve which server URL to use — done here (not at module level) to avoid
  // the circular config ↔ window import triggering a TDZ error on startup
  _buildUrl = new URL(
    app.commandLine.hasSwitch("force-server")
      ? app.commandLine.getSwitchValue("force-server")
      : config.customServer || DEFAULT_SERVER,
  );

  // (CLI arg --hidden or config)
  const startHidden =
    app.commandLine.hasSwitch("hidden") || config.startMinimisedToTray;

  // create the window
  mainWindow = new BrowserWindow({
    minWidth: 300,
    minHeight: 300,
    width: 1280,
    height: 720,
    backgroundColor: "#111114",
    frame: !config.customFrame,
    icon: windowIcon,
    show: !startHidden,
    webPreferences: {
      // relative to `.vite/build`
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  // hide the options
  mainWindow.setMenu(null);

  // restore last position if it was moved previously
  if (config.windowState.x > 0 || config.windowState.y > 0) {
    mainWindow.setPosition(
      config.windowState.x ?? 0,
      config.windowState.y ?? 0,
    );
  }

  // restore last size if it was resized previously
  if (config.windowState.width > 0 && config.windowState.height > 0) {
    mainWindow.setSize(
      config.windowState.width ?? 1280,
      config.windowState.height ?? 720,
    );
  }

  // maximise the window if it was maximised before
  if (config.windowState.isMaximised) {
    mainWindow.maximize();
  }

  // show server picker on first launch / when no server is saved,
  // otherwise go straight to the saved (or CLI-forced) server
  const forceServer = app.commandLine.hasSwitch("force-server");
  if (!forceServer && !config.customServer) {
    loadServerPicker(mainWindow);
  } else {
    mainWindow.loadURL(_buildUrl.toString());
  }

  // minimise window to tray
  mainWindow.on("close", (event) => {
    if (!shouldQuit && config.minimiseToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // update tray menu when window is shown/hidden
  mainWindow.on("show", updateTrayMenu);
  mainWindow.on("hide", updateTrayMenu);

  // keep track of window state
  function generateState() {
    config.windowState = {
      x: mainWindow.getPosition()[0],
      y: mainWindow.getPosition()[1],
      width: mainWindow.getSize()[0],
      height: mainWindow.getSize()[1],
      isMaximised: mainWindow.isMaximized(),
    };
  }

  mainWindow.on("maximize", generateState);
  mainWindow.on("unmaximize", generateState);
  mainWindow.on("moved", generateState);
  mainWindow.on("resized", generateState);

  // rebind zoom controls to be more sensible
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.control && (input.key === "=" || input.key === "+")) {
      // zoom in (+)
      event.preventDefault();
      mainWindow.webContents.setZoomLevel(
        mainWindow.webContents.getZoomLevel() + 1,
      );
    } else if (input.control && input.key === "-") {
      // zoom out (-)
      event.preventDefault();
      mainWindow.webContents.setZoomLevel(
        mainWindow.webContents.getZoomLevel() - 1,
      );
    } else if (input.control && input.key === "0") {
      // reset zoom to default.
      event.preventDefault();
      mainWindow.webContents.setZoomLevel(0);
    } else if (
      input.key === "F5" ||
      ((input.control || input.meta) && input.key.toLowerCase() === "r")
    ) {
      event.preventDefault();
      mainWindow.webContents.reload();
    }
  });

  // send the config, then inject the switch-server button when on the chat page
  mainWindow.webContents.on("did-finish-load", () => {
    config.sync();
    const pageUrl = mainWindow.webContents.getURL();
    try {
      if (
        pageUrl.startsWith("http") &&
        new URL(pageUrl).origin === _buildUrl.origin
      ) {
        injectSwitchServerButton();
      }
    } catch {
      // ignore malformed URLs
    }
  });

  // configure spellchecker context menu
  mainWindow.webContents.on("context-menu", (_, params) => {
    const menu = new Menu();

    // add all suggestions
    for (const suggestion of params.dictionarySuggestions) {
      menu.append(
        new MenuItem({
          label: suggestion,
          click: () => mainWindow.webContents.replaceMisspelling(suggestion),
        }),
      );
    }

    // allow users to add the misspelled word to the dictionary
    if (params.misspelledWord) {
      menu.append(
        new MenuItem({
          label: "Add to dictionary",
          click: () =>
            mainWindow.webContents.session.addWordToSpellCheckerDictionary(
              params.misspelledWord,
            ),
        }),
      );
    }

    // add an option to toggle spellchecker
    menu.append(
      new MenuItem({
        label: "Toggle spellcheck",
        click() {
          config.spellchecker = !config.spellchecker;
        },
      }),
    );

    // show menu if we've generated enough entries
    if (menu.items.length > 0) {
      menu.popup();
    }
  });

  // push world events to the window
  ipcMain.on("minimise", () => mainWindow.minimize());
  ipcMain.on("maximise", () =>
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(),
  );
  ipcMain.on("close", () => mainWindow.close());
}

// navigate to a server URL, persist it, and load it in the window
// registered once at module level — ipcMain.handle throws on duplicate registration
ipcMain.handle("navigate", (_, url: string) => {
  try {
    _buildUrl = new URL(url);
    // only persist if not overridden by --force-server CLI flag
    if (!app.commandLine.hasSwitch("force-server")) {
      config.customServer = url;
    }
    mainWindow.loadURL(url);
    return true;
  } catch {
    return false;
  }
});

// return the current server URL to the renderer
ipcMain.handle("getServerUrl", () => _buildUrl.toString());

// show the server picker without wiping the saved server
// (picker pre-fills from getServerUrl; a new choice is only saved on Connect)
ipcMain.handle("showServerPicker", () => {
  loadServerPicker(mainWindow);
});

/**
 * Quit the entire app
 */
export function quitApp() {
  shouldQuit = true;
  mainWindow.close();
}

// Ensure global app quit works properly
app.on("before-quit", () => {
  shouldQuit = true;
});
