/**
 * Unit tests for src/main.ts
 *
 * Since main.ts executes side-effects on import (it registers app events,
 * creates windows, etc.), every Electron / native dependency must be
 * deeply mocked before the module is imported.
 *
 * Each test re-creates the mock state and then requires main.ts via
 * `jest.isolateModules` so that the top-level code runs fresh.
 */

// ---------------------------------------------------------------------------
// Helper: reset all mock counters / flags between tests
// ---------------------------------------------------------------------------

function createFreshMocks() {
  const mockApp = {
    quit: jest.fn(),
    disableHardwareAcceleration: jest.fn(),
    requestSingleInstanceLock: jest.fn().mockReturnValue(true),
    on: jest.fn(),
    setAppUserModelId: jest.fn(),
    commandLine: {
      hasSwitch: jest.fn().mockReturnValue(false),
      getSwitchValue: jest.fn().mockReturnValue(""),
    },
  };

  const mockBrowserWindow = {
    getAllWindows: jest.fn().mockReturnValue([]),
  };

  const mockShell = {
    openExternal: jest.fn(),
  };

  const mockAutoLaunch = {
    enable: jest.fn(),
  };

  const mockConfig = {
    hardwareAcceleration: true,
    firstLaunch: true,
  };

  const mockInitDiscordRpc = jest.fn();
  const mockInitTray = jest.fn();

  const mockCreateMainWindow = jest.fn();
  const mockMainWindow = {
    show: jest.fn(),
    restore: jest.fn(),
    focus: jest.fn(),
  };

  const mockUpdateElectronApp = jest.fn();
  const mockStarted = false;

  return {
    mockApp,
    mockBrowserWindow,
    mockShell,
    mockAutoLaunch,
    mockConfig,
    mockInitDiscordRpc,
    mockInitTray,
    mockCreateMainWindow,
    mockMainWindow,
    mockUpdateElectronApp,
    mockStarted,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("main.ts", () => {
  // We will store references to the event callbacks registered by main.ts
  let eventCallbacks: Record<string, Function[]>;

  beforeEach(() => {
    eventCallbacks = {};
    jest.resetModules();
  });

  // -----------------------------------------------------------------------
  // 1. Squirrel startup – should quit immediately when started === true
  // -----------------------------------------------------------------------
  it("should quit immediately when electron-squirrel-startup is true", () => {
    const mocks = createFreshMocks();
    mocks.mockStarted = true;

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => true);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    expect(mocks.mockApp.quit).toHaveBeenCalled();
    // app.quit() is called but execution continues (no return),
    // so event handlers are still registered
    expect(mocks.mockApp.on).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 2. Hardware acceleration disabled when config says false
  // -----------------------------------------------------------------------
  it("should disable hardware acceleration when config.hardwareAcceleration is false", () => {
    const mocks = createFreshMocks();
    mocks.mockConfig.hardwareAcceleration = false;

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => false);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    expect(mocks.mockApp.disableHardwareAcceleration).toHaveBeenCalled();
  });

  it("should NOT disable hardware acceleration when config.hardwareAcceleration is true", () => {
    const mocks = createFreshMocks();
    mocks.mockConfig.hardwareAcceleration = true;

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => false);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    expect(mocks.mockApp.disableHardwareAcceleration).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 3. Single instance lock NOT acquired → quit
  // -----------------------------------------------------------------------
  it("should quit when single instance lock is NOT acquired", () => {
    const mocks = createFreshMocks();
    mocks.mockApp.requestSingleInstanceLock.mockReturnValue(false);

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => false);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    expect(mocks.mockApp.quit).toHaveBeenCalled();
    expect(mocks.mockApp.on).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 4. Single instance lock acquired → register event handlers
  // -----------------------------------------------------------------------
  it("should register event handlers when lock is acquired", () => {
    const mocks = createFreshMocks();

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => false);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    // Collect all registered events
    const registeredEvents: string[] = [];
    mocks.mockApp.on.mock.calls.forEach((call: [string, Function]) => {
      registeredEvents.push(call[0]);
    });

    expect(registeredEvents).toContain("ready");
    expect(registeredEvents).toContain("second-instance");
    expect(registeredEvents).toContain("window-all-closed");
    expect(registeredEvents).toContain("activate");
    expect(registeredEvents).toContain("web-contents-created");
  });

  // -----------------------------------------------------------------------
  // 5. "ready" event – calls updateElectronApp, creates window, init tray/RPC
  // -----------------------------------------------------------------------
  it("should call updateElectronApp on ready", () => {
    const mocks = createFreshMocks();

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => false);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    // updateElectronApp is called at the top of the lock-acquired block
    expect(mocks.mockUpdateElectronApp).toHaveBeenCalled();
  });

  it("should create main window, init tray, and init RPC on ready", () => {
    const mocks = createFreshMocks();

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => false);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    // Grab the "ready" callback
    const readyCb = mocks.mockApp.on.mock.calls.find(
      (c: [string, Function]) => c[0] === "ready",
    )![1];

    readyCb();

    expect(mocks.mockCreateMainWindow).toHaveBeenCalled();
    expect(mocks.mockInitTray).toHaveBeenCalled();
    expect(mocks.mockInitDiscordRpc).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 6. "ready" event – autoLaunch.enable on first launch (win32)
  // -----------------------------------------------------------------------
  it("should enable autoLaunch on first launch on win32", () => {
    const mocks = createFreshMocks();
    mocks.mockConfig.firstLaunch = true;

    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => false);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    const readyCb = mocks.mockApp.on.mock.calls.find(
      (c: [string, Function]) => c[0] === "ready",
    )![1];

    readyCb();

    expect(mocks.mockAutoLaunch.enable).toHaveBeenCalled();

    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("should enable autoLaunch on first launch on darwin", () => {
    const mocks = createFreshMocks();
    mocks.mockConfig.firstLaunch = true;

    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "darwin" });

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => false);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    const readyCb = mocks.mockApp.on.mock.calls.find(
      (c: [string, Function]) => c[0] === "ready",
    )![1];

    readyCb();

    expect(mocks.mockAutoLaunch.enable).toHaveBeenCalled();

    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("should NOT enable autoLaunch when firstLaunch is false", () => {
    const mocks = createFreshMocks();
    mocks.mockConfig.firstLaunch = false;

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => false);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    const readyCb = mocks.mockApp.on.mock.calls.find(
      (c: [string, Function]) => c[0] === "ready",
    )![1];

    readyCb();

    expect(mocks.mockAutoLaunch.enable).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 7. "ready" event – Windows sets AppUserModelId
  // -----------------------------------------------------------------------
  it("should set AppUserModelId on win32 during ready", () => {
    const mocks = createFreshMocks();

    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => false);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    const readyCb = mocks.mockApp.on.mock.calls.find(
      (c: [string, Function]) => c[0] === "ready",
    )![1];

    readyCb();

    expect(mocks.mockApp.setAppUserModelId).toHaveBeenCalledWith(
      "chat.stoat.notifications",
    );

    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("should NOT set AppUserModelId on non-win32 platforms", () => {
    const mocks = createFreshMocks();

    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "linux" });

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => false);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    const readyCb = mocks.mockApp.on.mock.calls.find(
      (c: [string, Function]) => c[0] === "ready",
    )![1];

    readyCb();

    expect(mocks.mockApp.setAppUserModelId).not.toHaveBeenCalled();

    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  // -----------------------------------------------------------------------
  // 8. "second-instance" event – show, restore, focus
  // -----------------------------------------------------------------------
  it("should show, restore, and focus main window on second-instance", () => {
    const mocks = createFreshMocks();

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => false);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    const secondInstanceCb = mocks.mockApp.on.mock.calls.find(
      (c: [string, Function]) => c[0] === "second-instance",
    )![1];

    secondInstanceCb();

    expect(mocks.mockMainWindow.show).toHaveBeenCalled();
    expect(mocks.mockMainWindow.restore).toHaveBeenCalled();
    expect(mocks.mockMainWindow.focus).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 9. "window-all-closed" – quits on non-darwin, does nothing on darwin
  // -----------------------------------------------------------------------
  it("should quit on window-all-closed when platform is not darwin", () => {
    const mocks = createFreshMocks();

    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => false);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    const windowAllClosedCb = mocks.mockApp.on.mock.calls.find(
      (c: [string, Function]) => c[0] === "window-all-closed",
    )![1];

    windowAllClosedCb();

    expect(mocks.mockApp.quit).toHaveBeenCalled();

    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("should NOT quit on window-all-closed when platform is darwin", () => {
    const mocks = createFreshMocks();

    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "darwin" });

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => false);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    const windowAllClosedCb = mocks.mockApp.on.mock.calls.find(
      (c: [string, Function]) => c[0] === "window-all-closed",
    )![1];

    windowAllClosedCb();

    expect(mocks.mockApp.quit).not.toHaveBeenCalled();

    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  // -----------------------------------------------------------------------
  // 10. "activate" event – creates window if none exist
  // -----------------------------------------------------------------------
  it("should create main window on activate when no windows exist", () => {
    const mocks = createFreshMocks();
    mocks.mockBrowserWindow.getAllWindows.mockReturnValue([]);

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => false);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    const activateCb = mocks.mockApp.on.mock.calls.find(
      (c: [string, Function]) => c[0] === "activate",
    )![1];

    activateCb();

    expect(mocks.mockCreateMainWindow).toHaveBeenCalled();
  });

  it("should show and focus main window on activate when windows exist", () => {
    const mocks = createFreshMocks();
    mocks.mockBrowserWindow.getAllWindows.mockReturnValue([{}]);

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => false);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    const activateCb = mocks.mockApp.on.mock.calls.find(
      (c: [string, Function]) => c[0] === "activate",
    )![1];

    activateCb();

    expect(mocks.mockCreateMainWindow).not.toHaveBeenCalled();
    expect(mocks.mockMainWindow.show).toHaveBeenCalled();
    expect(mocks.mockMainWindow.focus).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 11. "web-contents-created" – will-navigate prevents navigation off-origin
  // -----------------------------------------------------------------------
  it("should prevent navigation to URLs outside BUILD_URL origin", () => {
    const mocks = createFreshMocks();

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => false);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    const webContentsCreatedCb = mocks.mockApp.on.mock.calls.find(
      (c: [string, Function]) => c[0] === "web-contents-created",
    )![1];

    const mockContents = {
      on: jest.fn(),
      setWindowOpenHandler: jest.fn(),
    };

    webContentsCreatedCb({}, mockContents);

    // Grab the will-navigate callback
    const willNavigateCb = mockContents.on.mock.calls.find(
      (c: [string, Function]) => c[0] === "will-navigate",
    )![1];

    const mockEvent = { preventDefault: jest.fn() };

    // Same origin – should NOT prevent
    willNavigateCb(mockEvent, "https://beta.revolt.chat/some/path");
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();

    // Different origin – should prevent
    const mockEvent2 = { preventDefault: jest.fn() };
    willNavigateCb(mockEvent2, "https://evil.com/phishing");
    expect(mockEvent2.preventDefault).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 12. "web-contents-created" – setWindowOpenHandler denies and opens
  // external links
  // -----------------------------------------------------------------------
  it("should deny http/https/mailto links and open them externally", (done) => {
    const mocks = createFreshMocks();

    jest.doMock("electron", () => ({
      app: mocks.mockApp,
      BrowserWindow: mocks.mockBrowserWindow,
      shell: mocks.mockShell,
    }));
    jest.doMock("electron-squirrel-startup", () => false);
    jest.doMock("update-electron-app", () => ({
      updateElectronApp: mocks.mockUpdateElectronApp,
    }));
    jest.doMock("./native/autoLaunch", () => ({
      autoLaunch: mocks.mockAutoLaunch,
    }));
    jest.doMock("./native/config", () => ({ config: mocks.mockConfig }));
    jest.doMock("./native/discordRpc", () => ({
      initDiscordRpc: mocks.mockInitDiscordRpc,
    }));
    jest.doMock("./native/tray", () => ({ initTray: mocks.mockInitTray }));
    jest.doMock("./native/window", () => ({
      BUILD_URL: new URL("https://beta.revolt.chat"),
      createMainWindow: mocks.mockCreateMainWindow,
      mainWindow: mocks.mockMainWindow,
    }));

    require("./main");

    const webContentsCreatedCb = mocks.mockApp.on.mock.calls.find(
      (c: [string, Function]) => c[0] === "web-contents-created",
    )![1];

    const mockContents = {
      on: jest.fn(),
      setWindowOpenHandler: jest.fn(),
    };

    webContentsCreatedCb({}, mockContents);

    const setWindowOpenHandler =
      mockContents.setWindowOpenHandler.mock.calls[0][0];

    // Test https
    const result1 = setWindowOpenHandler({ url: "https://example.com" });
    expect(result1).toEqual({ action: "deny" });

    // Test http
    const result2 = setWindowOpenHandler({ url: "http://example.com" });
    expect(result2).toEqual({ action: "deny" });

    // Test mailto
    const result3 = setWindowOpenHandler({ url: "mailto:test@example.com" });
    expect(result3).toEqual({ action: "deny" });

    // Verify shell.openExternal is called (via setImmediate)
    setTimeout(() => {
      expect(mocks.mockShell.openExternal).toHaveBeenCalledWith(
        "https://example.com",
      );
      expect(mocks.mockShell.openExternal).toHaveBeenCalledWith(
        "http://example.com",
      );
      expect(mocks.mockShell.openExternal).toHaveBeenCalledWith(
        "mailto:test@example.com",
      );
      done();
    }, 10);
  });
});
