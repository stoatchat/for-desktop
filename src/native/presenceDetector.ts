import { powerMonitor } from "electron";

import { clearDetectedActivity, setDetectedActivity } from "./discordRpc";

const { activeWindowSync } = require("active-win");

// Configuration options with defaults
export interface PresenceDetectorOptions {
  /** Polling interval in milliseconds (default: 5000) */
  pollIntervalMs?: number;
  /** Debounce interval in milliseconds to prevent excessive updates (default: 1000) */
  debounceMs?: number;
  /** Maximum number of retries for failed window lookups (default: 3) */
  maxFetchRetries?: number;
  /** Delay between retries in milliseconds (default: 100) */
  fetchRetryDelayMs?: number;
}

/** Normalizes an application name/path for comparison */
function normalizeAppName(value: string): string {
  return value
    .replace(/\\/g, "/")
    .replace(/\.(exe|app)$/i, "")
    .replace(/\.root$/i, "")
    .replace(/[-_.]+/g, " ")
    .trim();
}

/** Extracts the executable name without extension from a path */
function extractExecutableName(value: string): string {
  const match = value.match(/([^\\/]+)\.(?:exe|app)$/i);
  return match?.[1] ?? "";
}

/** Attempts to extract a Steam game name from the owner path or window title */
function getSteamGameName(processName: string, title: string, ownerPath = ""): string {
  const normalizedOwnerPath = ownerPath.replace(/\\/g, "/").toLowerCase();

  if (
    normalizedOwnerPath.includes("/steamapps/common/") ||
    normalizedOwnerPath.includes("/steam/steamapps/common/")
  ) {
    const pathParts = ownerPath.replace(/\\/g, "/").split("/").filter(Boolean);
    const commonIndex = pathParts.findIndex((part) => part.toLowerCase() === "common");

    if (commonIndex >= 0 && pathParts[commonIndex + 1]) {
      return normalizeAppName(pathParts[commonIndex + 1]);
    }
  }

  const directName = normalizeAppName(title || processName || "");
  const isSteamClient = [
    "steam",
    "steam web helper",
    "steamwebhelper",
    "steam client bootstrapper",
  ].includes(directName.toLowerCase());

  if (!isSteamClient && /steam/i.test(directName)) {
    return directName;
  }

  return "";
}

/** Builds a PresenceActivity from window info, or null if no meaningful activity */
function buildActivity(processName: string, title: string, ownerPath = ""): { state: string; details: string; timestamps?: { start: number } } | null {
  const normalizedProcessName = processName.toLowerCase();
  const normalizedTitle = title.toLowerCase();

  // ---- Stoat detection (avoid overly broad matches) ----
  const isStoatApp =
    normalizedProcessName === "stoat" ||
    normalizedProcessName === "stoat desktop" ||
    normalizedProcessName.includes("stoat desktop") ||
    (normalizedProcessName.includes("stoat") &&
      (normalizedProcessName.includes("desktop") ||
        normalizedProcessName.includes("app") ||
        normalizedTitle.includes("stoat"))) ||
    (normalizedProcessName.includes("electron") && normalizedTitle.includes("stoat"));

  if (isStoatApp) {
    return {
      state: "Chatting",
      details: "In Stoat",
      timestamps: { start: Date.now() },
    };
  }

  // ---- Steam game detection ----
  const steamGameName = getSteamGameName(processName, title, ownerPath);
  if (steamGameName) {
    return {
      state: "Playing",
      details: steamGameName,
      timestamps: { start: Date.now() },
    };
  }

  // ---- Generic Steam detection ----
  if (
    normalizedProcessName.includes("steam") ||
    normalizedProcessName.includes("steamwebhelper") ||
    normalizedTitle.includes("steam")
  ) {
    const steamDisplayName = normalizeAppName(title || processName || "");
    const isSteamClient = [
      "steam",
      "steam web helper",
      "steamwebhelper",
    ].includes(steamDisplayName.toLowerCase());

    if (isSteamClient) {
      return {
        state: "In Steam",
        details: "Using Steam",
        timestamps: { start: Date.now() },
      };
    }

    return {
      state: "Playing",
      details: steamDisplayName || "Steam Game",
      timestamps: { start: Date.now() },
    };
  }

  // ---- Other specific app detections ----
  if (normalizedProcessName.includes("valorant")) {
    return {
      state: "Playing",
      details: "Valorant",
      timestamps: { start: Date.now() },
    };
  }

  if (normalizedProcessName.includes("league")) {
    return {
      state: "Playing",
      details: "League of Legends",
      timestamps: { start: Date.now() },
    };
  }

  if (
    normalizedProcessName.includes("cs2") ||
    normalizedProcessName.includes("counter-strike")
  ) {
    return {
      state: "Playing",
      details: "Counter-Strike 2",
      timestamps: { start: Date.now() },
    };
  }

  if (
    normalizedProcessName.includes("whatsapp") ||
    normalizedTitle.includes("whatsapp")
  ) {
    return {
      state: "Chatting",
      details: "Using WhatsApp",
      timestamps: { start: Date.now() },
    };
  }

  if (normalizedProcessName.includes("discord")) {
    return {
      state: "Chatting",
      details: "Using Discord",
      timestamps: { start: Date.now() },
    };
  }

  if (
    normalizedProcessName.includes("code") ||
    normalizedProcessName.includes("vscode")
  ) {
    return {
      state: "Developing",
      details: "Coding in VS Code",
      timestamps: { start: Date.now() },
    };
  }

  if (normalizedProcessName.includes("obs")) {
    return {
      state: "Streaming",
      details: "Broadcasting with OBS",
      timestamps: { start: Date.now() },
    };
  }

  if (
    normalizedProcessName.includes("chrome") ||
    normalizedProcessName.includes("msedge") ||
    normalizedProcessName.includes("firefox")
  ) {
    const details = title
      ? `Browsing ${title}`
      : "Browsing the web";
    return {
      state: "Browsing",
      details: details.length > 128 ? details.slice(0, 128) : details,
      timestamps: { start: Date.now() },
    };
  }

  if (normalizedTitle.includes("valorant")) {
    return {
      state: "In-game",
      details: "Playing Valorant",
      timestamps: { start: Date.now() },
    };
  }

  // ---- Windows system features (ignore) ----
  const windowsSystemProcesses = [
    "searchui",
    "startmenuexperiencehost",
    "shellexperiencehost",
    "settings",
    "systemsettings",
    "taskmgr",
    "actioncenter",
    "yourphone",
    "search",
    "cortana",
    "windowsshell",
    "dwm",
    "explorer",
  ];
  const windowsSystemTitleIndicators = [
    "search",
    "settings",
    "task manager",
    "action center",
    "control panel",
    "windows security",
    "windows defender",
    "feedback hub",
    "microsoft store",
  ];

  if (
    windowsSystemProcesses.some(proc => normalizedProcessName.includes(proc)) ||
    windowsSystemTitleIndicators.some(indicator => normalizedTitle.includes(indicator))
  ) {
    return null;
  }

  // ---- Desktop/Explorer (ignore) ----
  if (
    normalizedProcessName.includes("explorer") ||
    normalizedProcessName.includes("shell") ||
    normalizedProcessName.includes("desktop") ||
    normalizedTitle.includes("desktop") ||
    normalizedTitle.includes("program manager")
  ) {
    return null;
  }

  // ---- Fallback generic activity ----
  const appName = normalizeAppName(processName || title || "Unknown app");
  return {
    state: "Active",
    details: `Using ${appName || "an app"}`,
    timestamps: { start: Date.now() },
  };
}

/**
 * Fetches foreground window info using a provided lookup function.
 * By default uses activeWindowSync, but can be overridden for testing.
 */
function getForegroundInfo(
  lookup: (options: { screen: boolean }) => ReturnType<typeof activeWindowSync> | undefined
) {
  try {
    const activeWindow = lookup({ screen: true });
    const ownerName = activeWindow?.owner?.name ?? "";
    const ownerPath = activeWindow?.owner?.path ?? "";
    const title = activeWindow?.title ?? "";
    const executableName = extractExecutableName(ownerPath);
    const inferredProcessName = normalizeAppName(
      executableName || ownerName || title,
    );
    const normalizedTitle = title.toLowerCase();
    const titleHint = normalizeAppName(title || "");
    const normalizedTitleHint = titleHint.toLowerCase();
    const normalizedProcessName = inferredProcessName.toLowerCase();
    const shouldUseTitleHint =
      Boolean(titleHint) &&
      (normalizedTitle.includes("stoat") || normalizedTitleHint.includes("stoat")) &&
      (normalizedProcessName === "electron" || normalizedProcessName === "app" || normalizedProcessName === "");

    return {
      processName: shouldUseTitleHint ? titleHint : inferredProcessName || titleHint || (normalizedTitle.includes("stoat") ? "stoat" : ""),
      title,
      ownerPath,
    };
  } catch (error) {
    console.warn("Foreground window lookup failed", error);
    return {
      processName: "",
      title: "",
      ownerPath: "",
    };
  }
}

/** Activity detection state */
let detectionTimer: NodeJS.Timeout | undefined;
let lastKey = "";
let activityDetectionEnabled = true;
let lastUpdateTime = 0;

/**
 * Detects activity with retry logic and debouncing.
 * @param lookup Function to get foreground info (injectable for testing)
 * @param options Configuration options
 */
async function detectActivity(
  lookup: (options: { screen: boolean }) => ReturnType<typeof activeWindowSync> | undefined,
  options: PresenceDetectorOptions = {}
) {
  if (!activityDetectionEnabled) {
    clearDetectedActivity();
    return;
  }

  const {
    debounceMs = 1000,
    maxFetchRetries = 3,
    fetchRetryDelayMs = 100,
  } = options;

  // Throttle updates: if we updated too recently, skip unless forced by a major change
  const now = Date.now();
  if (now - lastUpdateTime < debounceMs) {
    // Still within debounce window; we can still update if the activity is completely cleared
    // but we'll rely on the key change detection below.
  }

 let info;
  let attempts = 0;
  while (attempts <= maxFetchRetries) {
    try {
      info = getForegroundInfo(lookup);
      break; // success
    } catch (err) {
      attempts++;
      if (attempts > maxFetchRetries) {
        console.error("Failed to detect active application after retries", err);
        clearDetectedActivity();
        lastKey = "";
        return;
      }
      // wait before retry
      await new Promise((resolve) =>
        setTimeout(resolve, fetchRetryDelayMs * attempts)
      );
    }
  }

  if (!info?.processName) {
    clearDetectedActivity();
    lastKey = "";
    return;
  }

  const activity = buildActivity(
    info.processName,
    info.title,
    info.ownerPath
  );

  const key = `${activity?.details ?? ""}:${activity?.state ?? ""}`;

  if (!activity) {
    clearDetectedActivity();
    if (lastKey) {
      lastKey = "";
    }
    return;
  }

  // Only update if the activity changed
  if (key !== lastKey) {
    setDetectedActivity(activity as Record<string, unknown>);
    lastKey = key;
    lastUpdateTime = now;
  }
}

/** Starts activity detection with configurable options */
export function startActivityDetection(
  options: PresenceDetectorOptions = {},
  // For testing: inject a lookup function that mimics activeWindowSync
  lookup?: (options: { screen: boolean }) => ReturnType<typeof activeWindowSync> | undefined
) {
  activityDetectionEnabled = true;

  const actualLookup = lookup ?? activeWindowSync;

  if (detectionTimer) {
    clearInterval(detectionTimer);
  }

  const {
    pollIntervalMs = 5000,
  } = options;

  detectionTimer = setInterval(() => {
    void detectActivity(actualLookup, options);
  }, pollIntervalMs);

  // Initial detection
  void detectActivity(actualLookup, options);

  // React to system resume events
  powerMonitor.on("resume", () => {
    void detectActivity(actualLookup, options);
  });
}

/** Stops activity detection and clears state */
export function stopActivityDetection() {
  activityDetectionEnabled = false;

  if (detectionTimer) {
    clearInterval(detectionTimer);
    detectionTimer = undefined;
  }

  lastKey = "";
  lastUpdateTime = 0;
  clearDetectedActivity();
}