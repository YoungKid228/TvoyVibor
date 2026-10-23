// режимы, в которых браузер запускает установленное PWA;
// minimal-ui используется частью Android-браузеров (например, Samsung Internet)
const INSTALLED_DISPLAY_MODES = ["standalone", "minimal-ui"];

export function isStandalone(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  const installed = INSTALLED_DISPLAY_MODES.some((mode) =>
    window.matchMedia(`(display-mode: ${mode})`).matches,
  );
  const iosStandalone =
    (navigator as { standalone?: boolean }).standalone === true;
  return installed || iosStandalone;
}

// Chrome (Android) присылает beforeinstallprompt один раз при загрузке,
// поэтому событие нужно поймать на уровне модуля, а не в момент рендера
let deferredInstallPrompt: unknown = null;
const installPromptListeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installPromptListeners.forEach((listener) => listener());
  });
}

export function canPromptInstall(): boolean {
  return deferredInstallPrompt !== null;
}

export function subscribeToInstallPrompt(listener: () => void): () => void {
  installPromptListeners.add(listener);
  return () => installPromptListeners.delete(listener);
}

/** Показывает нативный диалог установки (Android/Chrome). */
export async function promptInstall(): Promise<boolean> {
  if (deferredInstallPrompt === null) return false;
  const event = deferredInstallPrompt as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: string }>;
  };
  deferredInstallPrompt = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === "accepted";
}
