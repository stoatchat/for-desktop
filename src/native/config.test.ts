// @ts-nocheck
const mockStoreGet = jest.fn();
const mockStoreSet = jest.fn();
const mockWebContentsSend = jest.fn();
const mockSetSpellCheckerEnabled = jest.fn();

jest.mock("electron", () => ({
  ipcMain: {
    on: jest.fn(),
  },
}));

jest.mock("electron-store", () => {
  return jest.fn().mockImplementation(() => ({
    get: mockStoreGet,
    set: mockStoreSet,
  }));
});

jest.mock("./discordRpc", () => ({
  initDiscordRpc: jest.fn(),
  destroyDiscordRpc: jest.fn(),
}));

jest.mock("./window", () => ({
  mainWindow: {
    webContents: {
      send: mockWebContentsSend,
      session: {
        setSpellCheckerEnabled: mockSetSpellCheckerEnabled,
      },
    },
  },
}));

import { ipcMain } from "electron";
import { initDiscordRpc, destroyDiscordRpc } from "./discordRpc";

beforeEach(() => {
  mockStoreGet.mockClear();
  mockStoreSet.mockClear();
  mockWebContentsSend.mockClear();
  mockSetSpellCheckerEnabled.mockClear();
  (initDiscordRpc as jest.Mock).mockClear();
  (destroyDiscordRpc as jest.Mock).mockClear();

  // Reset store defaults
  mockStoreGet.mockImplementation((key: string) => {
    const defaults: Record<string, unknown> = {
      firstLaunch: true,
      customFrame: true,
      minimiseToTray: true,
      spellchecker: true,
      hardwareAcceleration: true,
      discordRpc: true,
      windowState: { isMaximised: false },
    };
    return defaults[key];
  });
});

// Import config after mocks are set up
import { config } from "./config";

describe("config", () => {
  describe("getters", () => {
    it("should return the correct value for firstLaunch", () => {
      expect(config.firstLaunch).toBe(true);
    });

    it("should return the correct value for customFrame", () => {
      expect(config.customFrame).toBe(true);
    });

    it("should return the correct value for minimiseToTray", () => {
      expect(config.minimiseToTray).toBe(true);
    });

    it("should return the correct value for spellchecker", () => {
      expect(config.spellchecker).toBe(true);
    });

    it("should return the correct value for hardwareAcceleration", () => {
      expect(config.hardwareAcceleration).toBe(true);
    });

    it("should return the correct value for discordRpc", () => {
      expect(config.discordRpc).toBe(true);
    });

    it("should return the correct value for windowState", () => {
      expect(config.windowState).toEqual({ isMaximised: false });
    });
  });

  describe("setters", () => {
    it("should set firstLaunch correctly", () => {
      config.firstLaunch = false;
      expect(mockStoreSet).toHaveBeenCalledWith("firstLaunch", false);
    });

    it("should set customFrame correctly", () => {
      config.customFrame = false;
      expect(mockStoreSet).toHaveBeenCalledWith("customFrame", false);
    });

    it("should set minimiseToTray correctly", () => {
      config.minimiseToTray = false;
      expect(mockStoreSet).toHaveBeenCalledWith("minimiseToTray", false);
    });

    it("should set hardwareAcceleration correctly", () => {
      config.hardwareAcceleration = false;
      expect(mockStoreSet).toHaveBeenCalledWith("hardwareAcceleration", false);
    });

    it("should set windowState correctly", () => {
      const newState = { isMaximised: true };
      config.windowState = newState;
      expect(mockStoreSet).toHaveBeenCalledWith("windowState", newState);
    });
  });

  describe("spellchecker setter", () => {
    it("should call setSpellCheckerEnabled when setting spellchecker", () => {
      config.spellchecker = false;
      expect(mockSetSpellCheckerEnabled).toHaveBeenCalledWith(false);
      expect(mockStoreSet).toHaveBeenCalledWith("spellchecker", false);
    });
  });

  describe("discordRpc setter", () => {
    it("should call initDiscordRpc when setting discordRpc to true", () => {
      config.discordRpc = true;
      expect(initDiscordRpc).toHaveBeenCalled();
      expect(mockStoreSet).toHaveBeenCalledWith("discordRpc", true);
    });

    it("should call destroyDiscordRpc when setting discordRpc to false", () => {
      config.discordRpc = false;
      expect(destroyDiscordRpc).toHaveBeenCalled();
      expect(mockStoreSet).toHaveBeenCalledWith("discordRpc", false);
    });
  });

  describe("sync", () => {
    it("should send the current config to the renderer via IPC", () => {
      config.sync();
      expect(mockWebContentsSend).toHaveBeenCalledWith("config", {
        firstLaunch: true,
        customFrame: true,
        minimiseToTray: true,
        spellchecker: true,
        hardwareAcceleration: true,
        discordRpc: true,
        windowState: { isMaximised: false },
      });
    });
  });

  describe("setter side effects (sync)", () => {
    it("should call sync after setting firstLaunch", () => {
      config.firstLaunch = false;
      expect(mockWebContentsSend).toHaveBeenCalled();
    });

    it("should call sync after setting customFrame", () => {
      config.customFrame = false;
      expect(mockWebContentsSend).toHaveBeenCalled();
    });

    it("should call sync after setting minimiseToTray", () => {
      config.minimiseToTray = false;
      expect(mockWebContentsSend).toHaveBeenCalled();
    });

    it("should call sync after setting spellchecker", () => {
      config.spellchecker = false;
      expect(mockWebContentsSend).toHaveBeenCalled();
    });

    it("should call sync after setting hardwareAcceleration", () => {
      config.hardwareAcceleration = false;
      expect(mockWebContentsSend).toHaveBeenCalled();
    });

    it("should call sync after setting discordRpc", () => {
      config.discordRpc = false;
      expect(mockWebContentsSend).toHaveBeenCalled();
    });

    it("should call sync after setting windowState", () => {
      config.windowState = { isMaximised: true };
      expect(mockWebContentsSend).toHaveBeenCalled();
    });
  });

  describe("IPC handler", () => {
    it("should register an IPC handler for config", () => {
      expect(ipcMain.on).toHaveBeenCalledWith("config", expect.any(Function));
    });

    it("should update config when receiving IPC message", () => {
      const handler = (ipcMain.on as jest.Mock).mock.calls[0][1];
      handler({}, { firstLaunch: false, customFrame: false });
      expect(mockStoreSet).toHaveBeenCalledWith("firstLaunch", false);
      expect(mockStoreSet).toHaveBeenCalledWith("customFrame", false);
    });
  });
});
