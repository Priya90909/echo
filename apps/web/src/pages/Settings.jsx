import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, json } from "../api.js";
export default function Settings({ user }) {
  const [message, setMessage] = useState("");
  const qc = useQueryClient();
  return (
    <main className="page">
      <span className="eyebrow">YOUR ECHO</span>
      <h1>Make yourself at home.</h1>
      <form
        className="panel form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api("/users/me", {
              method: "PATCH",
              body: json(Object.fromEntries(new FormData(e.currentTarget))),
            });
            await qc.invalidateQueries({ queryKey: ["me"] });
            setMessage("Profile saved.");
          } catch (e) {
            setMessage(e.message);
          }
        }}
      >
        <label>
          Display name
          <input name="name" defaultValue={user?.name} required minLength={2} />
        </label>
        <label>
          Email
          <input value={user?.email ?? ""} disabled />
        </label>
        <p>Account role: {user?.role}</p>
        <button className="primary">Save profile</button>
        {message && <p role="status">{message}</p>}
      </form>
      <p>
        Player shortcuts: Space to pause; left and right arrows to seek five
        seconds.
      </p>
    </main>
  );
}
