// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import {
  render,
  fireEvent,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
vi.mock("../apps/web/src/api", () => ({
  api: vi.fn(async (path) => {
    if (path === "/auth/providers") return { google: false };
    throw new Error("Email or password is incorrect.");
  }),
  json: JSON.stringify,
}));
import App, { Auth } from "../apps/web/src/App.jsx";
import { api } from "../apps/web/src/api.js";
it("renders a server login rejection without losing the form", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "listener@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "incorrect-long-password" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Sign in" }).closest("form"),
  );
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "Email or password is incorrect.",
    ),
  );
  expect(screen.getByLabelText("Email").value).toBe("listener@example.com");
  expect(
    screen.getByRole("button", { name: "Sign in" }).hasAttribute("disabled"),
  ).toBe(false);
  cleanup();
  client.clear();
});
it("keeps the newly signed-in account visible while removing the previous account's cached data", async () => {
  localStorage.clear();
  const pause = vi
    .spyOn(HTMLMediaElement.prototype, "pause")
    .mockImplementation(() => {});
  const user = {
    _id: "account-cache-check",
    name: "Cache Test",
    email: "cache@example.com",
    role: "listener",
  };
  vi.mocked(api).mockImplementation(async (path) => {
    if (path === "/auth/providers") return { google: false };
    if (path === "/auth/me")
      throw Object.assign(new Error("Sign in"), { status: 401 });
    if (path === "/auth/login") return user;
    if (path === "/catalog") return { tracks: [], genres: [], total: 0 };
    return [];
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(["/likes"], [{ title: "Previous user's private song" }]);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: user.email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "secure-account-password" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Sign in" }).closest("form"),
  );
  await waitFor(() => expect(screen.getByText("Cache Test")).toBeTruthy());
  expect(client.getQueryData(["me"])).toEqual(user);
  expect(client.getQueryData(["/likes"])).toBeUndefined();
  cleanup();
  client.clear();
  localStorage.clear();
  pause.mockRestore();
});
