// @ts-nocheck
const mockIpcRendererSend = jest.fn();
const mockExposeInMainWorld = jest.fn();

jest.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld: mockExposeInMainWorld,
  },
  ipcRenderer: {
    send: mockIpcRendererSend,
  },
}));

beforeEach(() => {
  jest.resetModules();
  mockIpcRendererSend.mockClear();
  mockExposeInMainWorld.mockClear();
});

describe("world/window", () => {
  describe("module initialization", () => {
    it("should expose 'native' on the context bridge", () => {
      require("./window");
      expect(mockExposeInMainWorld).toHaveBeenCalledWith(
        "native",
        expect.any(Object)
      );
    });
  });

  describe("exposed native API", () => {
    let nativeApi: any;

    beforeEach(() => {
      require("./window");
      nativeApi = mockExposeInMainWorld.mock.calls[0][1];
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
