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
