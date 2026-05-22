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

    it("should register a 'ready' event handler", async () => {
      await initDiscordRpc();

      expect(mockOn).toHaveBeenCalledWith("ready", expect.any(Function));
    });

    it("should set activity when 'ready' event fires", async () => {
      await initDiscordRpc();

      const readyHandler = mockOn.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === "ready",
      )![1];
      readyHandler();

      expect(mockSetActivity).toHaveBeenCalledWith({
        state: "stoat.chat",
        details: "Chatting with others",
        largeImageKey: "qr",
        largeImageText: "",
        buttons: [
          {
            label: "Join Stoat",
            url: "https://stoat.chat/",
          },
        ],
      });
    });

    it("should register a 'disconnected' event handler", async () => {
      await initDiscordRpc();

      expect(mockOn).toHaveBeenCalledWith("disconnected", expect.any(Function));
    });

    it("should schedule a reconnect when 'disconnected' event fires", async () => {
      await initDiscordRpc();

      const disconnectedHandler = mockOn.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) =>
          call[0] === "disconnected",
      )![1];
      disconnectedHandler();

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1e4);
    });

    it("should login with the correct clientId", async () => {
      await initDiscordRpc();

      expect(mockLogin).toHaveBeenCalledWith({
        clientId: "872068124005007420",
      });
    });

    it("should call reconnect on error", async () => {
      MockClient.mockImplementationOnce(() => {
        throw new Error("Connection failed");
      });

      await initDiscordRpc();

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1e4);
    });
  });

  describe("destroyDiscordRpc", () => {
    it("should destroy the rpc client if it exists", async () => {
      await initDiscordRpc();
      await destroyDiscordRpc();

      expect(mockDestroy).toHaveBeenCalled();
    });

    it("should not throw if rpc client is not initialized", async () => {
      // Ensure no client is initialized by using a fresh state
      const { config } = require("./config");
      config.discordRpc = false;

      await expect(destroyDiscordRpc()).resolves.not.toThrow();
    });
  });
});
