export const PASSWORD_RECOVERY_EVENT = "PASSWORD_RECOVERY";

export function isPasswordRecoveryEvent(event) {
  return event === PASSWORD_RECOVERY_EVENT;
}

export function hasPasswordRecoveryMarker(locationLike = {}) {
  const searchParams = new URLSearchParams(String(locationLike.search || "").replace(/^\?/, ""));
  const hashParams = new URLSearchParams(String(locationLike.hash || "").replace(/^#/, ""));
  return searchParams.get("type") === "recovery" || hashParams.get("type") === "recovery";
}

export function clearPasswordRecoveryUrl(historyLike, locationLike) {
  if (!historyLike?.replaceState) return;
  historyLike.replaceState({}, "", locationLike?.pathname || "/");
}
