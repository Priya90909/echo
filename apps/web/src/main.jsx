import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles.css";
const App = lazy(() => import("./App.jsx"));
class Boundary extends React.Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="auth">
        <h1>Something went quiet.</h1>
        <p>Reload to reconnect to ECHO.</p>
        <button onClick={() => location.reload()}>Reload</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Boundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<div className="skeleton" />}>
            <App />
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </Boundary>
  </React.StrictMode>,
);
// Retire ECHO's offline shell without deleting previously imported song files.
if ("serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
    await Promise.all(registrations
      .filter((registration) => registration.active?.scriptURL.endsWith("/offline-sw.js"))
      .map((registration) => registration.unregister()));
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith("echo-shell-")).map((name) => caches.delete(name)));
    }
  }).catch(() => {});
}

