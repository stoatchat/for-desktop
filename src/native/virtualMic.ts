/* eslint-disable @typescript-eslint/no-explicit-any */
// Disable any checks because node-pipewire doesn't have types for our submodule
import { app, ipcMain } from "electron";

import { sinkName, sourceName } from "../constants";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

function getPids() {
  return app.getAppMetrics().map((proc) => proc.pid ?? -1);
}

export const isWayland =
  process.platform === "linux" &&
  (process.env.XDG_SESSION_TYPE === "wayland" || !!process.env.WAYLAND_DISPLAY);

ipcMain.handle("getIsWayland", () => isWayland);

export async function initVirtualMic() {
  // Only available on Wayland
  if (!isWayland) return;

  try {
    const {
      createPwThread,
      createSink,
      createSource,
      getClients,
      getNodes,
      linkNodesNameToId,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore This module may not be found on non-linux builds.
    } = await import("node-pipewire"); //eslint-disable-line

    createPwThread();

    // Wait for pipewire thread to start and gather neccessary data
    await delay(100);

    let nodes: any[] = getNodes();

    let sinkFound = false;
    let sourceFound = false;
    for (const node of nodes) {
      if (node.name === sinkName) {
        sinkFound = true;
      }
      if (node.name === sourceName) {
        sourceFound = true;
      }
    }

    if (!sinkFound) {
      createSink(sinkName, ["FL", "FR"], false);
    }

    if (!sourceFound) {
      createSource(sourceName, ["FL", "FR"], false);
    }

    // Wait for source and sink to save
    await delay(100);

    const appName = app.getName();

    nodes = getNodes();
    const savedNodes: Record<number, any> = {};
    const sourceNode = nodes.filter((node: any) => node.name === sourceName)[0];
    const sinkNode = nodes.filter((node: any) => node.name === sinkName)[0];

    linkNodesNameToId(sinkNode.name, sourceNode.id, false);

    setInterval(() => {
      const ourClients: Record<number, any> = {};
      const paClients: any[] = [];

      const pids = getPids();
      const clients = getClients();
      for (const client of clients) {
        // If the client belongs to one of the electton processes
        if (pids.includes(client.pid)) {
          ourClients[client.pid] = client;
        }
        // If the client is a pulse audio client made on behalf of this app
        if (client.application_name === appName) {
          paClients.push(client);
        }
      }

      nodes = getNodes()
        // Only choose output streams
        .filter(
          (node: any) => node.props["media.class"] === "Stream/Output/Audio",
        )
        // Ignore any nodes from electron's processes
        .filter(
          (node: any) =>
            !Object.values(ourClients)
              .map((client) => client.id)
              .includes(Number(node.props["client.id"])),
        )
        // Ignore any nodes from pulse audio processes for the app
        .filter(
          (node: any) =>
            !paClients
              .map((client) => client.id)
              .includes(Number(node.props["client.id"])),
        );

      for (const node of nodes) {
        const idAsNum = Number(node.id);
        // If this node hasn't been seen before (ie. new node)
        if (!savedNodes[idAsNum]) {
          // Link all of the new node's outputs to our virtual sink
          linkNodesNameToId(node.name, sinkNode.id, false);
          savedNodes[idAsNum] = node;
        }
      }

      // Cleanup savedNodes for nodes that are gone
      for (const id in savedNodes) {
        const asNum = Number(id);
        if (!nodes.find((node) => node.id === asNum)) {
          savedNodes[asNum] = void 0;
        }
      }
    }, 1000);
  } catch {
    console.log(
      "node-pipewire failed to load. Screen share audio will not work on linux wayland.",
    );
  }
}
