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

describe("preload", () => {
  describe("module initialization", () => {
    it("should load the config module and register an IPC listener for 'config' messages", () => {
      require("./preload");
      expect(mockIpcRendererOn).toHaveBeenCalledWith(
        "config",
        expect.any(Function)
      );
    });

    it("should load the window module and expose 'native' on the context bridge", () => {
      require("./preload");
      const exposedApis = mockExposeInMainWorld.mock.calls.map(
        (call) => call[0]
      );
      expect(exposedApis).toContain("native");
    });

    it("should expose 'desktopConfig' on the context bridge", () => {
      require("./preload");
      const exposedApis = mockExposeInMainWorld.mock.calls.map(
        (call) => call[0]
      );
      expect(exposedApis).toContain("desktopConfig");
    });

    it("should expose exactly two APIs on the context bridge", () => {
      require("./preload");
      expect(mockExposeInMainWorld).toHaveBeenCalledTimes(2);
    });
  });

  describe("exposed desktopConfig API", () => {
    let desktopConfig: any;

    beforeEach(() => {
      require("./preload");
      desktopConfig = mockExposeInMainWorld.mock.calls.find(
        (call) => call[0] === "desktopConfig"
      )[1];
    });

    it("should have a get method", () => {
      expect(typeof desktopConfig.get).toBe("function");
    });

    it("should have a set method", () => {
      expect(typeof desktopConfig.set).toBe("function");
    });

    it("should have a getAutostart method", () => {
      expect(typeof desktopConfig.getAutostart).toBe("function");
    });

    it("should have a setAutostart method", () => {
      expect(typeof desktopConfig.setAutostart).toBe("function");
    });

    describe("get", () => {
      it("should return undefined when no config has been received", () => {
        expect(desktopConfig.get()).toBeUndefined();
      });

      it("should return the config after it has been set via IPC", () => {
        const configHandler = mockIpcRendererOn.mock.calls.find(
          (call) => call[0] === "config"
        )[1];
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

  describe("exposed native API", () => {
    let nativeApi: any;

    beforeEach(() => {
      require("./preload");
      nativeApi = mockExposeInMainWorld.mock.calls.find(
        (call) => call[0] === "native"
      )[1];
    });

    describe("versions", () => {
      it("should expose a versions object", () => {
        expect(nativeApi.versions).toBeDefined();
        expect(typeof nativeApi.versions).toBe("object");
      });

      it("should have a node version getter", () => {
        expect(typeof nativeApi.versions.node).toBe("function");
      });

      it("should have a chrome version getter", () => {
        expect(typeof nativeApi.versions.chrome).toBe("function");
      });

      it("should have an electron version getter", () => {
        expect(typeof nativeApi.versions.electron).toBe("function");
      });

      it("should have a desktop version getter", () => {
        expect(typeof nativeApi.versions.desktop).toBe("function");
      });
    });

    describe("minimise", () => {
      it("should send 'minimise' via IPC", () => {
        nativeApi.minimise();
        expect(mockIpcRendererSend).toHaveBeenCalledWith("minimise");
      });
    });

    describe("maximise", () => {
      it("should send 'maximise' via IPC", () => {
        nativeApi.maximise();
        expect(mockIpcRendererSend).toHaveBeenCalledWith("maximise");
      });
    });

    describe("close", () => {
      it("should send 'close' via IPC", () => {
        nativeApi.close();
        expect(mockIpcRendererSend).toHaveBeenCalledWith("close");
      });
    });
  });
});
