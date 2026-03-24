import "./index.css";

const DEFAULT_SERVER = "https://beta.revolt.chat";

type NativeAPI = {
  minimise: () => void;
  maximise: () => void;
  close: () => void;
  navigate: (url: string) => Promise<boolean>;
  getServerUrl: () => Promise<string>;
};

declare global {
  interface Window {
    native: NativeAPI;
  }
}

async function init() {
  const optOfficial = document.getElementById(
    "opt-official",
  ) as HTMLButtonElement;
  const optCustom = document.getElementById("opt-custom") as HTMLButtonElement;
  const inputGroup = document.getElementById(
    "custom-input-group",
  ) as HTMLDivElement;
  const serverUrlInput = document.getElementById(
    "server-url-input",
  ) as HTMLInputElement;
  const customUrlPreview = document.getElementById(
    "custom-url-preview",
  ) as HTMLSpanElement;
  const connectBtn = document.getElementById(
    "connect-btn",
  ) as HTMLButtonElement;
  const urlError = document.getElementById("url-error") as HTMLSpanElement;

  // Window control bindings
  document
    .getElementById("btn-minimise")
    ?.addEventListener("click", () => window.native.minimise());
  document
    .getElementById("btn-maximise")
    ?.addEventListener("click", () => window.native.maximise());
  document
    .getElementById("btn-close")
    ?.addEventListener("click", () => window.native.close());

  let mode: "official" | "custom" = "official";

  function setMode(next: "official" | "custom") {
    mode = next;
    optOfficial.classList.toggle("active", next === "official");
    optCustom.classList.toggle("active", next === "custom");
    inputGroup.classList.toggle("visible", next === "custom");
    if (next === "custom") {
      serverUrlInput.focus();
    }
  }

  // Try to pre-select the saved server
  try {
    const saved = await window.native.getServerUrl();
    if (saved && saved !== DEFAULT_SERVER) {
      serverUrlInput.value = saved;
      try {
        customUrlPreview.textContent = new URL(saved).hostname;
      } catch {
        customUrlPreview.textContent = saved;
      }
      setMode("custom");
    } else {
      setMode("official");
    }
  } catch {
    setMode("official");
  }

  optOfficial.addEventListener("click", () => {
    setMode("official");
    urlError.textContent = "";
  });

  optCustom.addEventListener("click", () => {
    setMode("custom");
  });

  serverUrlInput.addEventListener("input", () => {
    urlError.textContent = "";
    const raw = serverUrlInput.value.trim();
    try {
      customUrlPreview.textContent = new URL(raw).hostname || "Enter URL below";
    } catch {
      customUrlPreview.textContent = raw ? "Invalid URL" : "Enter URL below";
    }
  });

  async function connect() {
    urlError.textContent = "";

    const url =
      mode === "official" ? DEFAULT_SERVER : serverUrlInput.value.trim();

    if (mode === "custom") {
      if (!url) {
        urlError.textContent = "Please enter a server URL.";
        serverUrlInput.focus();
        return;
      }
      try {
        const parsed = new URL(url);
        if (!parsed.protocol.startsWith("http")) {
          urlError.textContent = "URL must start with http:// or https://";
          serverUrlInput.focus();
          return;
        }
      } catch {
        urlError.textContent = "Invalid URL — please check and try again.";
        serverUrlInput.focus();
        return;
      }
    }

    connectBtn.disabled = true;
    connectBtn.textContent = "Connecting…";

    const ok = await window.native.navigate(url);
    if (!ok) {
      connectBtn.disabled = false;
      connectBtn.textContent = "Connect";
      urlError.textContent = "Could not connect. Please try again.";
    }
  }

  connectBtn.addEventListener("click", connect);

  serverUrlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") connect();
  });
}

init();
