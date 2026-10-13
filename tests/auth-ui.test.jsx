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
import { Auth } from "../apps/web/src/App.jsx";
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
