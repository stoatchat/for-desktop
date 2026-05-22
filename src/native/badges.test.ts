/// <reference types="jest" />

const mockSetOverlayIcon = jest.fn();
const mockSetBadge = jest.fn();
const mockCreateFromDataURL = jest.fn();
const mockDbusMessage = jest.fn();
const mockDbusConnection = { message: mockDbusMessage };
const mockDbusSessionBus = jest.fn().mockReturnValue({
  connection: mockDbusConnection,
});

jest.mock("@homebridge/dbus-native", () => ({
  messageType: {
    signal: "signal",
  },
  sessionBus: mockDbusSessionBus,
}));

jest.mock("electron", () => ({
  app: {
    dock: {
      setBadge: mockSetBadge,
    },
  },
  nativeImage: {
    createFromDataURL: mockCreateFromDataURL,
  },
}));

jest.mock("./window", () => ({
  mainWindow: {
    setOverlayIcon: mockSetOverlayIcon,
  },
}));

// Mock dynamic imports for .ico?asset files — dynamic import returns a module
// object with a `default` export, so each mock returns an object with `default`.
jest.mock(
  "../../assets/desktop/badges/1.ico?asset",
  () => ({ default: "mocked-icon-1" }),
  { virtual: true },
);
jest.mock(
  "../../assets/desktop/badges/2.ico?asset",
  () => ({ default: "mocked-icon-2" }),
  { virtual: true },
);
jest.mock(
  "../../assets/desktop/badges/3.ico?asset",
  () => ({ default: "mocked-icon-3" }),
  { virtual: true },
);
jest.mock(
  "../../assets/desktop/badges/4.ico?asset",
  () => ({ default: "mocked-icon-4" }),
  { virtual: true },
);
jest.mock(
  "../../assets/desktop/badges/5.ico?asset",
  () => ({ default: "mocked-icon-5" }),
  { virtual: true },
);
jest.mock(
  "../../assets/desktop/badges/6.ico?asset",
  () => ({ default: "mocked-icon-6" }),
  { virtual: true },
);
jest.mock(
  "../../assets/desktop/badges/7.ico?asset",
  () => ({ default: "mocked-icon-7" }),
  { virtual: true },
);
jest.mock(
  "../../assets/desktop/badges/8.ico?asset",
  () => ({ default: "mocked-icon-8" }),
  { virtual: true },
);
jest.mock(
  "../../assets/desktop/badges/9.ico?asset",
  () => ({ default: "mocked-icon-9" }),
  { virtual: true },
);
jest.mock(
  "../../assets/desktop/badges/10.ico?asset",
  () => ({ default: "mocked-icon-10" }),
  { virtual: true },
);
jest.mock(
  "../../assets/desktop/badges/-1.ico?asset",
  () => ({ default: "mocked-icon--1" }),
  { virtual: true },
);

// Import after all mocks
import { setBadgeCount } from "./badges";

beforeEach(() => {
  jest.clearAllMocks();
  // Restore the default return value that clearAllMocks wipes out
  mockDbusSessionBus.mockReturnValue({
    connection: mockDbusConnection,
  });
});

describe("setBadgeCount", () => {
  describe("win32", () => {
    const originalPlatform = process.platform;

    beforeAll(() => {
      Object.defineProperty(process, "platform", {
        value: "win32",
        configurable: true,
      });
    });

    afterAll(() => {
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        configurable: true,
      });
    });

    it("should clear overlay icon when count is 0", async () => {
      await setBadgeCount(0);

      expect(mockSetOverlayIcon).toHaveBeenCalledWith(
        null,
        "No Notifications",
      );
    });

    it("should not load icon when count is 0", async () => {
      await setBadgeCount(0);

      expect(mockCreateFromDataURL).not.toHaveBeenCalled();
    });

    it("should load and set overlay icon for count > 0", async () => {
      const mockImage = {};
      mockCreateFromDataURL.mockReturnValue(mockImage);

      await setBadgeCount(5);

      expect(mockCreateFromDataURL).toHaveBeenCalled();
      expect(mockSetOverlayIcon).toHaveBeenCalledWith(
        mockImage,
        "5 Notifications",
      );
    });

    it("should cache native icons and reuse them", async () => {
      const mockImage = {};
      mockCreateFromDataURL.mockReturnValue(mockImage);

      await setBadgeCount(3);
      mockCreateFromDataURL.mockClear();

      await setBadgeCount(3);

      expect(mockCreateFromDataURL).not.toHaveBeenCalled();
      expect(mockSetOverlayIcon).toHaveBeenCalledWith(
        mockImage,
        "3 Notifications",
      );
    });

    it("should cap icon filename at 10 for counts greater than 10", async () => {
      const mockImage = {};
      mockCreateFromDataURL.mockReturnValue(mockImage);

      await setBadgeCount(99);

      expect(mockCreateFromDataURL).toHaveBeenCalledWith(
        expect.objectContaining({ default: expect.objectContaining({ default: "mocked-icon-10" }) }),
      );
    });

    it("should show 'Unread Messages' description when count is -1", async () => {
      const mockImage = {};
      mockCreateFromDataURL.mockReturnValue(mockImage);

      await setBadgeCount(-1);

      expect(mockSetOverlayIcon).toHaveBeenCalledWith(
        mockImage,
        "Unread Messages",
      );
    });
  });

  describe("darwin", () => {
    const originalPlatform = process.platform;

    beforeAll(() => {
      Object.defineProperty(process, "platform", {
        value: "darwin",
        configurable: true,
      });
    });

    afterAll(() => {
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        configurable: true,
      });
    });

    it("should set badge to '•' when count is -1", async () => {
      await setBadgeCount(-1);

      expect(mockSetBadge).toHaveBeenCalledWith("•");
    });

    it("should set badge to empty string when count is 0", async () => {
      await setBadgeCount(0);

      expect(mockSetBadge).toHaveBeenCalledWith("");
    });

    it("should set badge to count string when count > 0", async () => {
      await setBadgeCount(7);

      expect(mockSetBadge).toHaveBeenCalledWith("7");
    });

    it("should not use overlay icon on darwin", async () => {
      await setBadgeCount(5);

      expect(mockSetOverlayIcon).not.toHaveBeenCalled();
    });
  });

  describe("linux D-Bus", () => {
    const originalPlatform = process.platform;
    const originalContainer = process.env.container;

    beforeAll(() => {
      Object.defineProperty(process, "platform", {
        value: "_",
        configurable: true,
      });
    });

    afterAll(() => {
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        configurable: true,
      });
      process.env.container = originalContainer;
    });

    it("should create a session bus connection if not exists", async () => {
      process.env.container = "0";
      await setBadgeCount(5);

      expect(mockDbusSessionBus).toHaveBeenCalled();
    });

    it("should reuse existing session bus on subsequent calls", async () => {
      process.env.container = "0";
      mockDbusSessionBus.mockClear();

      await setBadgeCount(10);

      // sessionBus was already created, so it should not be called again
      expect(mockDbusSessionBus).not.toHaveBeenCalled();
    });

    it("should send a D-Bus signal message with correct properties", async () => {
      process.env.container = "0";
      mockDbusMessage.mockClear();

      await setBadgeCount(5);

      expect(mockDbusMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "signal",
          path: "/",
          interface: "com.canonical.Unity.LauncherEntry",
          member: "Update",
          signature: "sa{sv}",
        }),
      );
    });

    it("should use flatpak app ID when container env is '1'", async () => {
      process.env.container = "1";
      mockDbusMessage.mockClear();

      await setBadgeCount(5);

      const msg = mockDbusMessage.mock.calls[0][0];
      expect(msg.body[0]).toBe(
        "application://chat.stoat.stoat-desktop.desktop",
      );
    });

    it("should use standard app ID when container env is not '1'", async () => {
      process.env.container = "0";
      mockDbusMessage.mockClear();

      await setBadgeCount(5);

      const msg = mockDbusMessage.mock.calls[0][0];
      expect(msg.body[0]).toBe("application://stoat-desktop.desktop");
    });

    it("should set count-visible to false when count is 0", async () => {
      process.env.container = "0";
      mockDbusMessage.mockClear();

      await setBadgeCount(0);

      const msg = mockDbusMessage.mock.calls[0][0];
      const props = msg.body[1];
      const countVisible = props.find(
        (p: [string, unknown[]]) => p[0] === "count-visible",
      );
      expect(countVisible[1]).toEqual(["b", false]);
    });

    it("should set count-visible to true when count is not 0", async () => {
      process.env.container = "0";
      mockDbusMessage.mockClear();

      await setBadgeCount(5);

      const msg = mockDbusMessage.mock.calls[0][0];
      const props = msg.body[1];
      const countVisible = props.find(
        (p: [string, unknown[]]) => p[0] === "count-visible",
      );
      expect(countVisible[1]).toEqual(["b", true]);
    });
  });
});
