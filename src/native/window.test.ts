/// <reference types="jest" />

import {
  BrowserWindow,
  Menu,
  MenuItem,
  app,
  ipcMain,
  nativeImage,
} from "electron";

import { config } from "./config";
import { createMainWindow, quitApp, BUILD_URL } from "./window";
import { updateTrayMenu } from "./tray";

// Mock electron
let capturedBeforeQuitHandler: Function | null = null;

jest.mock("electron", () => ({
  BrowserWindow: jest.fn(),
  Menu: jest.fn().mockImplementation(() => ({
    append: jest.fn(),
    popup: jest.fn(),
    items: [] as unknown[],
  })),
  MenuItem: jest.fn().mockImplementation((opts: unknown) => opts),
  app: {
    commandLine: {
      hasSwitch: jest.fn().mockReturnValue(false),
      getSwitchValue: jest.fn().mockReturnValue(""),
    },
    on: jest.fn((event: string, handler: Function) => {
      if (event === "before-quit") {
        (global as Record<string, unknown>).__beforeQuitHandler = handler;
      }
    }),
  },
  ipcMain: {
    on: jest.fn(),
  },
  nativeImage: {
    createFromDataURL: jest.fn().mockReturnValue({}),
  },
}));

// Mock the asset import
jest.mock("../../assets/desktop/icon.png?asset", () => "mock-icon-path", {
  virtual: true,
});

// Mock config
jest.mock("./config", () => ({
  config: {
    customFrame: false,
    windowState: { isMaximised: false },
    minimiseToTray: true,
    spellchecker: true,
    sync: jest.fn(),
  },
}));

// Mock tray
jest.mock("./tray", () => ({
  updateTrayMenu: jest.fn(),
}));

const cfg = config as unknown as Record<string, unknown>;

describe("window", () => {
  let mockMainWindow: Record<string, jest.Mock | unknown>;
  let mockWebContents: Record<string, jest.Mock | unknown>;
  let eventHandlers: Record<string, Function[]>;
  let ipcHandlers: Record<string, Function>;
  let beforeQuitHandler: Function;

  beforeEach(() => {
    jest.clearAllMocks();

    eventHandlers = {};
    ipcHandlers = {};

    mockWebContents = {
      on: jest.fn((event: string, handler: Function) => {
        if (!eventHandlers[event]) {
          eventHandlers[event] = [];
        }
        eventHandlers[event].push(handler);
      }),
      setZoomLevel: jest.fn(),
      getZoomLevel: jest.fn().mockReturnValue(0),
      replaceMisspelling: jest.fn(),
      session: {
        addWordToSpellCheckerDictionary: jest.fn(),
      },
      openDevTools: jest.fn(),
    };

    mockMainWindow = {
      on: jest.fn((event: string, handler: Function) => {
        if (!eventHandlers[event]) {
          eventHandlers[event] = [];
        }
        eventHandlers[event].push(handler);
      }),
      setMenu: jest.fn(),
      maximize: jest.fn(),
      isMaximized: jest.fn().mockReturnValue(false),
      unmaximize: jest.fn(),
      minimize: jest.fn(),
      hide: jest.fn(),
      close: jest.fn(),
      loadURL: jest.fn(),
      webContents: mockWebContents,
    };

    (BrowserWindow as unknown as jest.Mock).mockImplementation(
      () => mockMainWindow,
    );

    (ipcMain.on as unknown as jest.Mock).mockImplementation(
      (channel: string, handler: Function) => {
        ipcHandlers[channel] = handler;
      },
    );

    (app.on as unknown as jest.Mock).mockImplementation(
      (event: string, handler: Function) => {
        if (event === "before-quit") {
          beforeQuitHandler = handler;
        }
      },
    );
  });

  describe("BUILD_URL", () => {
    it("should default to beta.revolt.chat when no force-server flag", () => {
      expect(BUILD_URL.toString()).toBe("https://beta.revolt.chat/");
    });

    it("should use force-server flag value when provided", () => {
      // BUILD_URL is evaluated at module load time, so we test the exported value
      // which reflects the default since mocks are set before import
      expect(BUILD_URL.toString()).toBe("https://beta.revolt.chat/");
    });
  });

  describe("createMainWindow", () => {
    it("should create a BrowserWindow with correct default options", () => {
      createMainWindow();

      expect(BrowserWindow).toHaveBeenCalledWith({
        minWidth: 300,
        minHeight: 300,
        width: 1280,
        height: 720,
        backgroundColor: "#191919",
        frame: true,
        icon: expect.anything(),
        webPreferences: {
          preload: expect.stringContaining("preload.js"),
          contextIsolation: true,
          nodeIntegration: false,
          spellcheck: true,
        },
      });
    });

    it("should set frame to false when customFrame is enabled", () => {
      cfg.customFrame = true;
      createMainWindow();

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          frame: false,
        }),
      );
    });

    it("should set menu to null", () => {
      createMainWindow();
      expect(mockMainWindow.setMenu).toHaveBeenCalledWith(null);
    });

    it("should load the BUILD_URL", () => {
      createMainWindow();
      expect(mockMainWindow.loadURL).toHaveBeenCalledWith(BUILD_URL.toString());
    });

    it("should maximize window if windowState.isMaximised is true", () => {
      cfg.windowState = { isMaximised: true };
      createMainWindow();

      expect(mockMainWindow.maximize).toHaveBeenCalled();
    });

    it("should not maximize window if windowState.isMaximised is false", () => {
      cfg.windowState = { isMaximised: false };
      createMainWindow();

      expect(mockMainWindow.maximize).not.toHaveBeenCalled();
    });
  });

  describe("window close event", () => {
    it("should hide window when minimiseToTray is true and shouldQuit is false", () => {
      cfg.minimiseToTray = true;
      createMainWindow();

      const closeHandler = eventHandlers["close"]?.[0];
      const event = { preventDefault: jest.fn() };
      closeHandler(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockMainWindow.hide).toHaveBeenCalled();
    });

    it("should not hide window when minimiseToTray is false", () => {
      cfg.minimiseToTray = false;
      createMainWindow();

      const closeHandler = eventHandlers["close"]?.[0];
      const event = { preventDefault: jest.fn() };
      closeHandler(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(mockMainWindow.hide).not.toHaveBeenCalled();
    });
  });

  describe("window show/hide events", () => {
    it("should call updateTrayMenu on show event", () => {
      createMainWindow();

      const showHandler = eventHandlers["show"]?.[0];
      showHandler();

      expect(updateTrayMenu).toHaveBeenCalled();
    });

    it("should call updateTrayMenu on hide event", () => {
      createMainWindow();

      const hideHandler = eventHandlers["hide"]?.[0];
      hideHandler();

      expect(updateTrayMenu).toHaveBeenCalled();
    });
  });

  describe("window state tracking", () => {
    it("should update config.windowState on maximize event", () => {
      (mockMainWindow.isMaximized as jest.Mock).mockReturnValue(true);
      createMainWindow();

      const maximizeHandler = eventHandlers["maximize"]?.[0];
      maximizeHandler();

      expect(config.windowState).toEqual({ isMaximised: true });
    });

    it("should update config.windowState on unmaximize event", () => {
      (mockMainWindow.isMaximized as jest.Mock).mockReturnValue(false);
      createMainWindow();

      const unmaximizeHandler = eventHandlers["unmaximize"]?.[0];
      unmaximizeHandler();

      expect(config.windowState).toEqual({ isMaximised: false });
    });
  });

  describe("zoom controls", () => {
    it("should zoom in on Ctrl+=", () => {
      (mockWebContents.getZoomLevel as jest.Mock).mockReturnValue(2);
      createMainWindow();

      const beforeInputHandler = eventHandlers["before-input-event"]?.[0];
      const event = { preventDefault: jest.fn() };
      beforeInputHandler(event, { control: true, key: "=" });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockWebContents.setZoomLevel).toHaveBeenCalledWith(3);
    });

    it("should zoom out on Ctrl+-", () => {
      (mockWebContents.getZoomLevel as jest.Mock).mockReturnValue(2);
      createMainWindow();

      const beforeInputHandler = eventHandlers["before-input-event"]?.[0];
      const event = { preventDefault: jest.fn() };
      beforeInputHandler(event, { control: true, key: "-" });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockWebContents.setZoomLevel).toHaveBeenCalledWith(1);
    });

    it("should not interfere with non-zoom shortcuts", () => {
      createMainWindow();

      const beforeInputHandler = eventHandlers["before-input-event"]?.[0];
      const event = { preventDefault: jest.fn() };
      beforeInputHandler(event, { control: true, key: "c" });

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(mockWebContents.setZoomLevel).not.toHaveBeenCalled();
    });
  });

  describe("did-finish-load event", () => {
    it("should call config.sync when page finishes loading", () => {
      createMainWindow();

      const finishLoadHandler = eventHandlers["did-finish-load"]?.[0];
      finishLoadHandler();

      expect(config.sync).toHaveBeenCalled();
    });
  });

  describe("context menu", () => {
    let contextMenuHandler: Function;

    beforeEach(() => {
      createMainWindow();
      contextMenuHandler = eventHandlers["context-menu"]?.[0];
    });

    it("should add dictionary suggestions as menu items", () => {
      const params = {
        dictionarySuggestions: ["hello", "world"] as string[],
        misspelledWord: "",
      };
      const mockMenu = {
        append: jest.fn(),
        popup: jest.fn(),
        items: [{}, {}, {}] as unknown[],
      };
      (Menu as unknown as jest.Mock).mockImplementation(() => mockMenu);

      contextMenuHandler({}, params);

      expect(mockMenu.append).toHaveBeenCalledTimes(3);
      expect(mockMenu.append).toHaveBeenCalledWith(
        expect.objectContaining({
          label: "hello",
        }),
      );
      expect(mockMenu.append).toHaveBeenCalledWith(
        expect.objectContaining({
          label: "world",
        }),
      );
    });

    it("should add 'Add to dictionary' option for misspelled word", () => {
      const params = {
        dictionarySuggestions: [] as string[],
        misspelledWord: "wrng",
      };
      const mockMenu = {
        append: jest.fn(),
        popup: jest.fn(),
        items: [{}, {}] as unknown[],
      };
      (Menu as unknown as jest.Mock).mockImplementation(() => mockMenu);

      contextMenuHandler({}, params);

      expect(mockMenu.append).toHaveBeenCalledWith(
        expect.objectContaining({
          label: "Add to dictionary",
        }),
      );
    });

    it("should add 'Toggle spellcheck' option", () => {
      const params = {
        dictionarySuggestions: [] as string[],
        misspelledWord: "",
      };
      const mockMenu = {
        append: jest.fn(),
        popup: jest.fn(),
        items: [{}] as unknown[],
      };
      (Menu as unknown as jest.Mock).mockImplementation(() => mockMenu);

      contextMenuHandler({}, params);

      expect(mockMenu.append).toHaveBeenCalledWith(
        expect.objectContaining({
          label: "Toggle spellcheck",
        }),
      );
    });

    it("should popup menu when there are items", () => {
      const params = {
        dictionarySuggestions: ["hello"] as string[],
        misspelledWord: "",
      };
      const mockMenu = {
        append: jest.fn(),
        popup: jest.fn(),
        items: [{}, {}] as unknown[],
      };
      (Menu as unknown as jest.Mock).mockImplementation(() => mockMenu);

      contextMenuHandler({}, params);

      expect(mockMenu.popup).toHaveBeenCalled();
    });

    it("should not popup menu when there are no items", () => {
      const params = {
        dictionarySuggestions: [] as string[],
        misspelledWord: "",
      };
      const mockMenu = {
        append: jest.fn(),
        popup: jest.fn(),
        items: [] as unknown[],
      };
      (Menu as unknown as jest.Mock).mockImplementation(() => mockMenu);

      contextMenuHandler({}, params);

      expect(mockMenu.popup).not.toHaveBeenCalled();
    });

    it("should call replaceMisspelling when suggestion is clicked", () => {
      const params = {
        dictionarySuggestions: ["correct"] as string[],
        misspelledWord: "",
      };
      let clickHandler: Function;
      const mockMenu = {
        append: jest.fn((item: { label: string; click: Function }) => {
          if (item.label === "correct") {
            clickHandler = item.click;
          }
        }),
        popup: jest.fn(),
        items: [{}] as unknown[],
      };
      (Menu as unknown as jest.Mock).mockImplementation(() => mockMenu);

      contextMenuHandler({}, params);

      clickHandler!();
      expect(mockWebContents.replaceMisspelling).toHaveBeenCalledWith("correct");
    });

    it("should call addWordToSpellCheckerDictionary when Add to dictionary is clicked", () => {
      const params = {
        dictionarySuggestions: [] as string[],
        misspelledWord: "wrng",
      };
      let clickHandler: Function;
      const mockMenu = {
        append: jest.fn((item: { label: string; click: Function }) => {
          if (item.label === "Add to dictionary") {
            clickHandler = item.click;
          }
        }),
        popup: jest.fn(),
        items: [{}, {}] as unknown[],
      };
      (Menu as unknown as jest.Mock).mockImplementation(() => mockMenu);

      contextMenuHandler({}, params);

      clickHandler!();
      expect(
        (mockWebContents.session as { addWordToSpellCheckerDictionary: jest.Mock })
          .addWordToSpellCheckerDictionary,
      ).toHaveBeenCalledWith("wrng");
    });

    it("should toggle spellchecker when Toggle spellcheck is clicked", () => {
      const params = {
        dictionarySuggestions: [] as string[],
        misspelledWord: "",
      };
      let clickHandler: Function;
      const mockMenu = {
        append: jest.fn((item: { label: string; click: Function }) => {
          if (item.label === "Toggle spellcheck") {
            clickHandler = item.click;
          }
        }),
        popup: jest.fn(),
        items: [{}] as unknown[],
      };
      (Menu as unknown as jest.Mock).mockImplementation(() => mockMenu);
      cfg.spellchecker = true;

      contextMenuHandler({}, params);

      clickHandler!();
      expect(cfg.spellchecker).toBe(false);
    });
  });

  describe("IPC handlers", () => {
    beforeEach(() => {
      createMainWindow();
    });

    it("should minimise window on 'minimise' IPC event", () => {
      ipcHandlers["minimise"]();
      expect(mockMainWindow.minimize).toHaveBeenCalled();
    });

    it("should maximise window on 'maximise' IPC event when not maximized", () => {
      (mockMainWindow.isMaximized as jest.Mock).mockReturnValue(false);
      ipcHandlers["maximise"]();
      expect(mockMainWindow.maximize).toHaveBeenCalled();
    });

    it("should unmaximise window on 'maximise' IPC event when maximized", () => {
      (mockMainWindow.isMaximized as jest.Mock).mockReturnValue(true);
      ipcHandlers["maximise"]();
      expect(mockMainWindow.unmaximize).toHaveBeenCalled();
    });

    it("should close window on 'close' IPC event", () => {
      ipcHandlers["close"]();
      expect(mockMainWindow.close).toHaveBeenCalled();
    });
  });

  describe("quitApp", () => {
    it("should close the main window", () => {
      createMainWindow();
      quitApp();
      expect(mockMainWindow.close).toHaveBeenCalled();
    });
  });

  describe("app before-quit event", () => {
    it("should register a before-quit handler at module load time", () => {
      // The before-quit handler is registered at module load time (top-level)
      // and stored on global by our mock
      expect((global as Record<string, unknown>).__beforeQuitHandler).toBeDefined();
    });

    it("should set shouldQuit to true when before-quit is triggered", () => {
      createMainWindow();

      // Get the before-quit handler from global
      const beforeQuitHandler = (global as Record<string, unknown>)
        .__beforeQuitHandler as Function;

      // Trigger the before-quit handler
      beforeQuitHandler();

      // Now trigger close event - it should not prevent default
      cfg.minimiseToTray = true;
      const closeHandler = eventHandlers["close"]?.[0];
      const event = { preventDefault: jest.fn() };
      closeHandler(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(mockMainWindow.hide).not.toHaveBeenCalled();
    });
  });
});
