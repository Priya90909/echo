const key = "echo-offline-account-v1";
export function accountSnapshot() {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}
export function offlineAccount() {
  try {
    const data = JSON.parse(accountSnapshot());
    return typeof data?._id === "string" && typeof data?.name === "string"
      ? data
      : null;
  } catch {
    return null;
  }
}
export function rememberAccount(user) {
  const previous = offlineAccount()?._id;
  try {
    if (user)
      localStorage.setItem(
        key,
        JSON.stringify({ _id: user._id, name: user.name }),
      );
    else localStorage.removeItem(key);
  } catch {}
  if (previous !== user?._id)
    window.dispatchEvent(new Event("echo:account-change"));
}
export function subscribeAccount(listener) {
  const changed = (event) => {
    if (event.type !== "storage" || event.key === key) listener(event);
  };
  window.addEventListener("storage", changed);
  window.addEventListener("echo:account-change", changed);
  return () => {
    window.removeEventListener("storage", changed);
    window.removeEventListener("echo:account-change", changed);
  };
}
