/// <reference types="jest" />

import AutoLaunch from "auto-launch";
import { ipcMain } from "electron";

import { autoLaunch } from "./autoLaunch";
import { mainWindow } from "./window";

// Mock auto-launch - define mock methods inside the factory
jest.mock("auto-launch", () => {
  const mockAutoLaunch = {
    isEnabled: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
  };
  const AutoLaunchMock = jest.fn().mockImplementation(() => mockAutoLaunch);
  (AutoLaunchMock as unknown as Record<string, unknown>).mockMethods =
    mockAutoLaunch;
  return AutoLaunchMock;
});

// Mock electron - store handlers on global
jest.mock("electron", () => ({
  ipcMain: {
    on: jest.fn((channel: string, handler: Function) => {
      (global as Record<string, unknown>).__autoLaunchIpcHandlers =
        (global as Record<string, unknown>).__autoLaunchIpcHandlers || {};
      ((global as Record<string, unknown>).__autoLaunchIpcHandlers as Record<
        string,
        Function
      >)[channel] = handler;
    }),
  },
}));

// Mock window
jest.mock("./window", () => ({
  mainWindow: {
    webContents: {
      send: jest.fn(),
    },
  },
}));

// Access the mock methods from the mocked constructor
const mockMethods = (AutoLaunch as unknown as Record<string, unknown>)
  .mockMethods as Record<string, jest.Mock>;

const getIpcHandlers = (): Record<string, Function> =>
  ((global as Record<string, unknown>).__autoLaunchIpcHandlers as Record<
    string,
    Function
  >) || {};

describe("autoLaunch", () => {
  beforeEach(() => {
    // Clear mock method calls but preserve AutoLaunch constructor call history
    // since it's called at module load time before tests run
    const mockMethods = (AutoLaunch as unknown as Record<string, unknown>)
      .mockMethods as Record<string, jest.Mock>;
    Object.values(mockMethods).forEach((mock) => mock.mockClear());
    (mainWindow.webContents.send as jest.Mock).mockClear();
  });

  describe("autoLaunch instance", () => {
    it("should create an AutoLaunch instance with the correct config", () => {
      expect(AutoLaunch).toHaveBeenCalledWith({
        name: "Revolt",
      });
    });

    it("should export the autoLaunch instance", () => {
      expect(autoLaunch).toBeDefined();
    });
  });

  describe("isAutostart? IPC handler", () => {
    it("should register the isAutostart? IPC handler", () => {
      expect(getIpcHandlers()["isAutostart?"]).toBeDefined();
    });

    it("should check if autoLaunch is enabled when handler is called", () => {
      mockMethods.isEnabled.mockResolvedValue(true);
      getIpcHandlers()["isAutostart?"]();

      expect(mockMethods.isEnabled).toHaveBeenCalled();
    });

    it("should send true to mainWindow when autoLaunch is enabled", async () => {
      mockMethods.isEnabled.mockResolvedValue(true);
      getIpcHandlers()["isAutostart?"]();

      await Promise.resolve();

      expect(mainWindow.webContents.send).toHaveBeenCalledWith(
        "isAutostart",
        true,
      );
    });

    it("should send false to mainWindow when autoLaunch is disabled", async () => {
      mockMethods.isEnabled.mockResolvedValue(false);
      getIpcHandlers()["isAutostart?"]();

      await Promise.resolve();

      expect(mainWindow.webContents.send).toHaveBeenCalledWith(
        "isAutostart",
        false,
      );
    });
  });

  describe("setAutostart IPC handler", () => {
    it("should register the setAutostart IPC handler", () => {
      expect(getIpcHandlers()["setAutostart"]).toBeDefined();
    });

    it("should enable autoLaunch when state is true", () => {
      getIpcHandlers()["setAutostart"](true);

      expect(mockMethods.enable).toHaveBeenCalled();
      expect(mockMethods.disable).not.toHaveBeenCalled();
    });

    it("should disable autoLaunch when state is false", () => {
      getIpcHandlers()["setAutostart"](false);

      expect(mockMethods.disable).toHaveBeenCalled();
      expect(mockMethods.enable).not.toHaveBeenCalled();
    });

    it("should disable autoLaunch when state is falsy", () => {
      getIpcHandlers()["setAutostart"](null);

      expect(mockMethods.disable).toHaveBeenCalled();
      expect(mockMethods.enable).not.toHaveBeenCalled();
    });

    it("should disable autoLaunch when state is undefined", () => {
      getIpcHandlers()["setAutostart"](undefined);

      expect(mockMethods.disable).toHaveBeenCalled();
      expect(mockMethods.enable).not.toHaveBeenCalled();
    });
  });
});
