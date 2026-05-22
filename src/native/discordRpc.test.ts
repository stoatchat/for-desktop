/// <reference types="jest" />

import { initDiscordRpc, destroyDiscordRpc } from "./discordRpc";

// Mock discord-rpc
const mockSetActivity = jest.fn();
const mockOn = jest.fn();
const mockLogin = jest.fn();
const mockDestroy = jest.fn();

jest.mock("discord-rpc", () => ({
  Client: jest.fn().mockImplementation(() => ({
    setActivity: mockSetActivity,
    on: mockOn,
    login: mockLogin,
    destroy: mockDestroy,
  })),
}));

// Mock config
jest.mock("./config", () => ({
  config: {
    discordRpc: true,
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Client: MockClient } = require("discord-rpc");

describe("discordRpc", () => {
  let setTimeoutSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    setTimeoutSpy = jest.spyOn(global, "setTimeout");
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
    jest.useRealTimers();
  });

  describe("initDiscordRpc", () => {
    it("should not initialize when config.discordRpc is false", async () => {
      const { config } = require("./config");
      config.discordRpc = false;

      await initDiscordRpc();

      expect(MockClient).not.toHaveBeenCalled();
    });

    it("should create a new Client with ipc transport when config.discordRpc is true", async () => {
      const { config } = require("./config");
      config.discordRpc = true;

      await initDiscordRpc();

      expect(MockClient).toHaveBeenCalledWith({ transport: "ipc" });
    });
  });

  describe("destroyDiscordRpc", () => {
    it("should not throw if rpc client is not initialized", async () => {
      // Ensure no client is initialized by using a fresh state
      const { config } = require("./config");
      config.discordRpc = false;

      await expect(destroyDiscordRpc()).resolves.not.toThrow();
    });
  });
});
