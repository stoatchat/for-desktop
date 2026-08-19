import { Client } from "discord-rpc";

import { config } from "./config";

// internal state
let rpc: Client | undefined;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Drop the current client and cancel any pending reconnect.
 *
 * Detaching the listeners before destroying matters: `destroy` makes the client
 * emit `disconnected`, which would otherwise schedule a reconnect for the
 * client we are in the middle of throwing away.
 */
function teardown() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }

  const client = rpc;
  rpc = undefined;

  if (!client) return;

  client.removeAllListeners();

  try {
    // rejects when the transport never connected in the first place
    const destroyed = client.destroy() as unknown;
    if (destroyed instanceof Promise) destroyed.catch(() => undefined);
  } catch {
    // nothing to tear down
  }
}

function reconnect() {
  if (reconnectTimer) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    initDiscordRpc();
  }, 1e4);
}

export async function initDiscordRpc() {
  if (!config.discordRpc) return;

  // tear down any existing client, otherwise it stays logged in to Discord and
  // keeps broadcasting the activity even after the user turns the setting off
  teardown();

  const client = new Client({ transport: "ipc" });
  rpc = client;

  client.on("ready", () =>
    client.setActivity({
      state: "stoat.chat",
      details: "Chatting with others",
      largeImageKey: "qr",
      largeImageText: "Join Stoat!",
      buttons: [
        {
          label: "Join Stoat",
          url: "https://stoat.chat/",
        },
      ],
    }),
  );

  client.on("disconnected", () => {
    // ignore clients we have already replaced or discarded
    if (rpc === client) reconnect();
  });

  try {
    // `login` is asynchronous; awaiting it here keeps a missing Discord client
    // from surfacing as an unhandled rejection and lets us retry
    await client.login({ clientId: "872068124005007420" });
  } catch {
    if (rpc === client) reconnect();
  }
}

export async function destroyDiscordRpc() {
  teardown();
}
