import { Client } from "discord-rpc";

import { config } from "./config";

// internal state
let rpc: Client | undefined;
let currentActivity: Record<string, unknown> | null = null;
let detectedActivity: Record<string, unknown> | null = null;
let isReady = false;

function buildRpcActivity(activity: Record<string, unknown> | null | undefined) {
  return {
    ...(activity ?? {}),
    largeImageKey: "qr",
    largeImageText: "Join Stoat!",
    buttons: [
      {
        label: "Join Stoat",
        url: "https://stoat.chat/",
      },
    ],
  };
}

function applyCurrentActivity(activity: Record<string, unknown> | null | undefined = currentActivity) {
  if (!rpc || !isReady) {
    return;
  }

  void rpc.setActivity(buildRpcActivity(activity)).catch((error) => {
    console.warn("Discord RPC activity update failed", error);
  });
}

export async function initDiscordRpc() {
  if (!config.discordRpc) return;

  // clean up existing client if one exists
  rpc?.removeAllListeners();

  try {
    rpc = new Client({ transport: "ipc" });

    rpc.on("ready", () => {
      isReady = true;
      if (currentActivity) {
        applyCurrentActivity(currentActivity);
      } else {
        applyCurrentActivity({
          state: "stoat.chat",
          details: "Chatting with others",
        });
      }
    });

    rpc.on("disconnected", () => {
      isReady = false;
      console.warn("Discord RPC disconnected");
      reconnect();
    });

    rpc.on("error", (error) => {
      isReady = false;
      console.error("Discord RPC error", error);
    });

    void rpc.login({ clientId: "872068124005007420" }).catch((error) => {
      console.error("Discord RPC login failed", error);
      reconnect();
    });
  } catch (err) {
    console.error("Discord RPC setup failed", err);
    reconnect();
  }
}

const reconnect = () => setTimeout(() => initDiscordRpc(), 1e4);

export async function destroyDiscordRpc() {
  currentActivity = null;
  isReady = false;
  await rpc?.clearActivity().catch(() => undefined);
  rpc?.destroy();
  rpc = undefined;
}

export function setDiscordActivity(activity: Record<string, unknown>) {
  currentActivity = activity;
  console.info("Updating Discord activity", activity);

  if (!rpc || !isReady) {
    return;
  }

  applyCurrentActivity(activity);
}

export function clearDiscordActivity() {
  currentActivity = null;
  console.info("Clearing Discord activity");

  if (!rpc || !isReady) {
    return;
  }

  void rpc.clearActivity().catch((error) => {
    console.warn("Discord RPC clear failed", error);
  });
}

export function setDetectedActivity(activity: Record<string, unknown>) {
  detectedActivity = activity;
  console.info("Prepared detected activity for Stoat backend", activity);
}

export function clearDetectedActivity() {
  detectedActivity = null;
  console.info("Cleared detected activity");
}

export function getDetectedActivity() {
  return detectedActivity;
}
