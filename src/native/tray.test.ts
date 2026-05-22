/// <reference types="jest" />

import { Menu, Tray, nativeImage } from "electron";

import { initTray, updateTrayMenu } from "./tray";
import { mainWindow, quitApp } from "./window";

// Mock electron
jest.mock("electron", () => ({
  Menu: {
    buildFromTemplate: jest.fn((template: unknown[]) => template),
  },
  Tray: jest.fn().mockImplementation(() => ({
    setToolTip: jest.fn(),
    setImage: jest.fn(),
    on: jest.fn(),
    setContextMenu: jest.fn(),
  })),
  nativeImage: {
    createFromDataURL: jest.fn().mockReturnValue({
      resize: jest.fn().mockReturnValue({
        setTemplateImage: jest.fn(),
      }),
    }),
  },
}));

// Mock the asset import
jest.mock("../../assets/desktop/icon.png?asset", () => "mock-icon-path", {
  virtual: true,
});

// Mock package.json
jest.mock("../../package.json", () => ({
  version: "1.1.11",
}), { virtual: true });

// Mock window
jest.mock("./window", () => ({
  mainWindow: {
    show: jest.fn(),
    focus: jest.fn(),
    isVisible: jest.fn().mockReturnValue(false),
    hide: jest.fn(),
  },
  quitApp: jest.fn(),
}));

describe("tray", () => {
  let mockTray: Record<string, jest.Mock>;
  let capturedClickHandler: Function;
  let capturedMenu: unknown[];

  beforeEach(() => {
    jest.clearAllMocks();

    capturedClickHandler = jest.fn();
    capturedMenu = [];

    mockTray = {
      setToolTip: jest.fn(),
      setImage: jest.fn(),
      on: jest.fn((event: string, handler: Function) => {
        if (event === "click") {
          capturedClickHandler = handler;
        }
      }),
      setContextMenu: jest.fn((menu: unknown[]) => {
        capturedMenu = menu;
      }),
    };

    (Tray as unknown as jest.Mock).mockImplementation(() => mockTray);
  });

  describe("initTray", () => {
    it("should create a tray icon from the asset", () => {
      initTray();

      expect(nativeImage.createFromDataURL).toHaveBeenCalledWith(
        "mock-icon-path",
      );
    });

    it("should create a new Tray instance with the resized icon", () => {
      initTray();

      expect(Tray).toHaveBeenCalled();
    });

    it("should set the tray tooltip", () => {
      initTray();

      expect(mockTray.setToolTip).toHaveBeenCalledWith("Stoat for Desktop");
    });

    it("should set the tray image", () => {
      initTray();

      expect(mockTray.setImage).toHaveBeenCalled();
    });

    it("should call updateTrayMenu during initialization", () => {
      initTray();

      expect(mockTray.setContextMenu).toHaveBeenCalled();
    });

    it("should register a click handler on the tray", () => {
      initTray();

      expect(mockTray.on).toHaveBeenCalledWith("click", expect.any(Function));
    });

    it("should show and focus main window when tray is clicked", () => {
      initTray();

      capturedClickHandler();

      expect(mainWindow.show).toHaveBeenCalled();
      expect(mainWindow.focus).toHaveBeenCalled();
    });
  });

  describe("updateTrayMenu", () => {
    it("should build a context menu from a template", () => {
      initTray();
      updateTrayMenu();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
    });

    it("should set the context menu on the tray", () => {
      initTray();
      updateTrayMenu();

      expect(mockTray.setContextMenu).toHaveBeenCalled();
    });

    it("should include a disabled label item for the app name", () => {
      initTray();
      updateTrayMenu();

      const appNameItem = capturedMenu.find(
        (item: { label: string }) => item.label === "Stoat for Desktop",
      );

      expect(appNameItem).toBeDefined();
      expect(appNameItem.enabled).toBe(false);
      expect(appNameItem.type).toBe("normal");
    });

    it("should include a version submenu with the current version", () => {
      initTray();
      updateTrayMenu();

      const versionItem = capturedMenu.find(
        (item: { label: string }) => item.label === "Version",
      );

      expect(versionItem).toBeDefined();
      expect(versionItem.type).toBe("submenu");
      expect(versionItem.submenu).toEqual([
        {
          label: "1.1.11",
          type: "normal",
          enabled: false,
        },
      ]);
    });

    it("should include a separator", () => {
      initTray();
      updateTrayMenu();

      const separatorItem = capturedMenu.find(
        (item: { type: string }) => item.type === "separator",
      );

      expect(separatorItem).toBeDefined();
    });

    it("should show 'Show App' when window is not visible", () => {
      (mainWindow.isVisible as jest.Mock).mockReturnValue(false);
      initTray();
      updateTrayMenu();

      const toggleItem = capturedMenu.find(
        (item: { label: string }) =>
          item.label === "Show App" || item.label === "Hide App",
      );

      expect(toggleItem.label).toBe("Show App");
      expect(toggleItem.type).toBe("normal");
    });

    it("should show 'Hide App' when window is visible", () => {
      (mainWindow.isVisible as jest.Mock).mockReturnValue(true);
      initTray();
      updateTrayMenu();

      const toggleItem = capturedMenu.find(
        (item: { label: string }) =>
          item.label === "Show App" || item.label === "Hide App",
      );

      expect(toggleItem.label).toBe("Hide App");
      expect(toggleItem.type).toBe("normal");
    });

    it("should hide the app when 'Hide App' menu item is clicked", () => {
      (mainWindow.isVisible as jest.Mock).mockReturnValue(true);
      initTray();
      updateTrayMenu();

      const toggleItem = capturedMenu.find(
        (item: { label: string }) => item.label === "Hide App",
      );

      toggleItem.click();

      expect(mainWindow.hide).toHaveBeenCalled();
      expect(mainWindow.show).not.toHaveBeenCalled();
    });

    it("should show the app when 'Show App' menu item is clicked", () => {
      (mainWindow.isVisible as jest.Mock).mockReturnValue(false);
      initTray();
      updateTrayMenu();

      const toggleItem = capturedMenu.find(
        (item: { label: string }) => item.label === "Show App",
      );

      toggleItem.click();

      expect(mainWindow.show).toHaveBeenCalled();
      expect(mainWindow.hide).not.toHaveBeenCalled();
    });

    it("should include a 'Quit App' menu item", () => {
      initTray();
      updateTrayMenu();

      const quitItem = capturedMenu.find(
        (item: { label: string }) => item.label === "Quit App",
      );

      expect(quitItem).toBeDefined();
      expect(quitItem.type).toBe("normal");
    });

    it("should call quitApp when 'Quit App' menu item is clicked", () => {
      initTray();
      updateTrayMenu();

      const quitItem = capturedMenu.find(
        (item: { label: string }) => item.label === "Quit App",
      );

      quitItem.click();

      expect(quitApp).toHaveBeenCalled();
    });

    it("should have the correct menu structure with all items in order", () => {
      initTray();
      updateTrayMenu();

      expect(capturedMenu).toHaveLength(5);
      expect(capturedMenu[0]).toEqual(
        expect.objectContaining({
          label: "Stoat for Desktop",
          type: "normal",
          enabled: false,
        }),
      );
      expect(capturedMenu[1]).toEqual(
        expect.objectContaining({
          label: "Version",
          type: "submenu",
        }),
      );
      expect(capturedMenu[2]).toEqual({ type: "separator" });
      expect(capturedMenu[3]).toEqual(
        expect.objectContaining({
          type: "normal",
        }),
      );
      expect(capturedMenu[4]).toEqual(
        expect.objectContaining({
          label: "Quit App",
          type: "normal",
        }),
      );
    });
  });
});
