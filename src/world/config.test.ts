// @ts-nocheck
const mockIpcRendererOn = jest.fn();
const mockIpcRendererSend = jest.fn();
const mockIpcRendererOnce = jest.fn();
const mockExposeInMainWorld = jest.fn();

jest.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld: mockExposeInMainWorld,
  },
  ipcRenderer: {
    on: mockIpcRendererOn,
    send: mockIpcRendererSend,
    once: mockIpcRendererOnce,
  },
}));

beforeEach(() => {
  jest.resetModules();
  mockIpcRendererOn.mockClear();
  mockIpcRendererSend.mockClear();
  mockIpcRendererOnce.mockClear();
  mockExposeInMainWorld.mockClear();
});

describe("world/config", () => {
  describe("module initialization", () => {
    it("should register an IPC listener for 'config' messages", () => {
      require("./config");
      expect(mockIpcRendererOn).toHaveBeenCalledWith(
        "config",
        expect.any(Function)
      );
    });

    it("should expose desktopConfig on the context bridge", () => {
      require("./config");
      expect(mockExposeInMainWorld).toHaveBeenCalledWith(
        "desktopConfig",
        expect.any(Object)
      );
    });
  });

  describe("exposed desktopConfig API", () => {
    let desktopConfig: any;

    beforeEach(() => {
      require("./config");
      desktopConfig = mockExposeInMainWorld.mock.calls[0][1];
    });

    describe("get", () => {
      it("should return undefined when no config has been received", () => {
        expect(desktopConfig.get()).toBeUndefined();
      });

      it("should return the config after it has been set via IPC", () => {
        const configHandler = mockIpcRendererOn.mock.calls[0][1];
        const mockConfig = { customFrame: false, spellchecker: true };
        configHandler({}, mockConfig);

        expect(desktopConfig.get()).toEqual(mockConfig);
      });
    });

    describe("set", () => {
      it("should send the config via IPC", () => {
        const mockConfig = { customFrame: true, spellchecker: false };
        desktopConfig.set(mockConfig);

        expect(mockIpcRendererSend).toHaveBeenCalledWith("config", mockConfig);
      });
    });
  });

  describe("IPC config message handler", () => {
    it("should update the internal config when receiving a 'config' IPC message", () => {
      require("./config");
      const desktopConfig = mockExposeInMainWorld.mock.calls[0][1];
      const configHandler = mockIpcRendererOn.mock.calls[0][1];
      const mockConfig = { firstLaunch: false, customFrame: true };

      configHandler({}, mockConfig);

      expect(desktopConfig.get()).toEqual(mockConfig);
    });
  });
});
