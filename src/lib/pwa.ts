export function isStandalone(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  const displayStandalone = window.matchMedia(
    "(display-mode: standalone)",
  ).matches;
  const iosStandalone =
    (navigator as { standalone?: boolean }).standalone === true;
  return displayStandalone || iosStandalone;
}
