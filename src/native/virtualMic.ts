import { PipewireNode } from "node-pipewire";

import { app, ipcMain } from "electron";

import { sinkName, sourceName } from "../constants";

// How many ms to wait for pipewire to settle. 100 should be safe.
const PW_SETTLE_MS = 100;

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

function getPids() {
  return app.getAppMetrics().map((proc) => proc.pid);
}

export const isWayland =
  process.platform === "linux" &&
  (process.env.XDG_SESSION_TYPE === "wayland" || !!process.env.WAYLAND_DISPLAY);

ipcMain.handle("getIsWayland", () => isWayland);

// eslint-disable-next-line @typescript-eslint/no-empty-function
let setupVirtualMic = async () => {};

// eslint-disable-next-line @typescript-eslint/no-empty-function
let teardownVirtualMic = async () => {};

export async function startVirtualMic() {
  return setupVirtualMic();
}

export async function destroyVirtualMic() {
  return teardownVirtualMic();
}

ipcMain.handle("destroyVirtualMic", () => destroyVirtualMic());

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
      getLinks,
      linkNodesNameToId,
      destroyObject,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore This module may not be found on non-linux builds.
    } = await import("node-pipewire"); //eslint-disable-line

    const appName = app.getName();
    let pwThreadStarted = false;
    let virtualMicActive = false;
    let virtualMicSetup: Promise<void> | undefined;
    let virtualMicTeardown: Promise<void> | undefined;
    let virtualMicInterval: NodeJS.Timeout | undefined;
    let savedNodes: Record<number, PipewireNode> = {};
    let sinkNode: PipewireNode | undefined;
    let sourceNode: PipewireNode | undefined;

    const pollNode = async (
      name: string,
      wait = true,
    ): Promise<PipewireNode | undefined> => {
      let nodes: PipewireNode[];
      for (let i = 0; i < 10; i++) {
        nodes = getNodes();
        const node = nodes.find((n) => n.name === name);
        if (node) return node;
        // Exit on first iteration if wait is false
        if (!wait) return;
        if (i < 9) await delay(PW_SETTLE_MS);
      }
    };

    const nodeCapture = async () => {
      const pids = getPids();
      const ownedClients = getClients()
        // If the client belongs to one of the electron processes or has an application name matching this app
        .filter((c) => pids.includes(c.pid) || c.application_name === appName)
        .reduce((accu, c) => accu.add(c.id), new Set<number>());

      const nodes = getNodes()
        // Only choose output streams
        .filter(
          (node: PipewireNode) =>
            node.props["media.class"] === "Stream/Output/Audio",
        )
        // Ignore any owned nodes
        .filter(
          (node: PipewireNode) =>
            !ownedClients.has(Number(node.props["client.id"])),
        );

      if (sinkNode) {
        for (const node of nodes) {
          const idAsNum = Number(node.id);
          // If this node hasn't been seen before (ie. new node)
          if (!savedNodes[idAsNum]) {
            // Link all of the new node's outputs to our virtual sink
            linkNodesNameToId(node.name, sinkNode.id, false);
            savedNodes[idAsNum] = node;
          }
        }
      }

      // Cleanup savedNodes for nodes that are gone
      for (const id in savedNodes) {
        const asNum = Number(id);
        if (!nodes.find((node) => node.id === asNum)) {
          delete savedNodes[asNum];
        }
      }
    };

    const setup = async () => {
      if (!pwThreadStarted) {
        createPwThread();
        pwThreadStarted = true;

        // Wait for pipewire thread to start and gather neccessary data
        await delay(PW_SETTLE_MS);
      }

      sourceNode = await pollNode(sourceName, false);
      sinkNode = await pollNode(sinkName, false);

      if (!sourceNode || !sinkNode) {
        if (!sinkNode) createSink(sinkName, ["FL", "FR"], false);
        if (!sourceNode) createSource(sourceName, ["FL", "FR"], false);
      }

      sourceNode = await pollNode(sourceName);
      sinkNode = await pollNode(sinkName);

      if (!sourceNode || !sinkNode)
        throw new Error("Source or sink not found after 1 second");

      linkNodesNameToId(sinkNode.name, sourceNode.id, false);
    };

    const teardown = async () => {
      clearInterval(virtualMicInterval);
      for (const link of getLinks()) {
        if (
          link.output_node_id === sinkNode?.id ||
          link.input_node_id === sinkNode?.id ||
          link.output_node_id === sourceNode?.id ||
          link.input_node_id === sourceNode?.id
        ) {
          destroyObject(link.id);
        }
      }
      // Allow pipewire and wireplumber to catch all the deleted links
      await delay(PW_SETTLE_MS);
      if (sinkNode) destroyObject(sinkNode.id);
      if (sourceNode) destroyObject(sourceNode.id);
      savedNodes = {};
      sinkNode = undefined;
      sourceNode = undefined;
      virtualMicInterval = undefined;
      virtualMicActive = false;
    };

    setupVirtualMic = async () => {
      // Wait for opposite phase
      if (virtualMicTeardown) {
        await virtualMicTeardown;
      }
      if (virtualMicActive) {
        return;
      }
      if (virtualMicSetup) {
        return virtualMicSetup;
      }
      try {
        virtualMicSetup = setup();
        await virtualMicSetup;
        virtualMicInterval = setInterval(nodeCapture, 1000);
        virtualMicActive = true;
      } catch (e) {
        await teardown();
        throw e;
      } finally {
        virtualMicSetup = undefined;
      }
    };

    teardownVirtualMic = async () => {
      // Wait for opposite phase
      if (virtualMicSetup) {
        await virtualMicSetup;
      }
      if (virtualMicTeardown) {
        return virtualMicTeardown;
      }
      try {
        virtualMicTeardown = teardown();
        await virtualMicTeardown;
      } finally {
        virtualMicTeardown = undefined;
      }
    };
  } catch {
    console.log(
      "node-pipewire failed to load. Screen share audio will not work on linux wayland.",
    );
  }
}
