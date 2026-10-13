import { beforeAll, afterAll, describe, it, expect } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../apps/api/src/app.js";
import * as M from "../apps/api/src/models.js";
const enabled = !!process.env.TEST_MONGODB_URI;
describe.skipIf(!enabled)(
  "MongoDB integration (isolated test database)",
  () => {
    let alice,
      bob,
      csrfA = "",
      csrfB = "",
      trackId = "",
      artistId = "",
      playlistId = "";
    const post = (agent, path, csrf, data, method = "post") =>
      agent[method](path)
        .set("Origin", "http://127.0.0.1:5173")
        .set("x-csrf-token", csrf)
        .send(data);
    beforeAll(async () => {
      if (!process.env.TEST_MONGODB_URI?.includes("echo_test"))
        throw new Error("TEST_MONGODB_URI must name an echo_test database.");
      await mongoose.connect(process.env.TEST_MONGODB_URI);
      await mongoose.connection.dropDatabase();
      await Promise.all(
        Object.values(M)
          .filter((m) => typeof m.init === "function")
          .map((m) => m.init()),
      );
      alice = request.agent(app);
      bob = request.agent(app);
      csrfA = (await alice.get("/api/auth/csrf")).body.token;
      csrfB = (await bob.get("/api/auth/csrf")).body.token;
    });
    afterAll(async () => {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    });
    it("registers and logs in securely", async () => {
      expect(
        (
          await post(alice, "/api/auth/register", csrfA, {
            name: "Alice",
            email: "alice@echo.test",
            password: "long-secure-password-1",
          })
        ).status,
      ).toBe(201);
      expect(
        (
          await post(bob, "/api/auth/register", csrfB, {
            name: "Bob",
            email: "bob@echo.test",
            password: "long-secure-password-2",
          })
        ).status,
      ).toBe(201);
      expect(
        (
          await post(alice, "/api/auth/login", csrfA, {
            email: "alice@echo.test",
            password: "incorrect-password",
          })
        ).status,
      ).toBe(401);
      expect((await alice.get("/api/auth/me")).body.email).toBe(
        "alice@echo.test",
      );
    });
    it("creates an artist and rejects ownership violations", async () => {
      const a = await post(alice, "/api/studio/profile", csrfA, {
        name: "Test Artist",
        bio: "Integration fixture",
      });
      artistId = a.body._id;
      const t = await M.Track.create({
        title: "Integration sound",
        artist: artistId,
        genre: "Ambient",
        moods: ["Focused"],
        license: "original",
        rightsConfirmed: true,
        status: "published",
        mediaKey: "test.wav",
      });
      trackId = String(t._id);
      await post(bob, "/api/studio/profile", csrfB, {
        name: "Other Artist",
        bio: "",
      });
      expect(
        (
          await post(
            bob,
            `/api/studio/tracks/${trackId}`,
            csrfB,
            { title: "Stolen" },
            "patch",
          )
        ).status,
      ).toBe(404);
    });
    it("searches the stored catalog and authorizes playback", async () => {
      const res = await alice.get("/api/search?q=Integration");
      expect(res.body.tracks[0]._id).toBe(trackId);
      expect(
        (await alice.get(`/api/tracks/${trackId}/playback`)).body.url,
      ).toContain("X-Amz-Signature");
      await M.Track.updateOne({ _id: trackId }, { status: "review" });
      expect((await alice.get(`/api/tracks/${trackId}/playback`)).status).toBe(
        404,
      );
      await M.Track.updateOne({ _id: trackId }, { status: "published" });
    });
    it("persists playlist CRUD and ordering with privacy", async () => {
      const p = await post(alice, "/api/playlists", csrfA, {
        name: "My Mix",
        visibility: "private",
      });
      expect(p.status).toBe(201);
      playlistId = p.body._id;
      expect(
        (
          await post(
            alice,
            `/api/playlists/${playlistId}/tracks`,
            csrfA,
            { tracks: [trackId] },
            "put",
          )
        ).status,
      ).toBe(204);
      expect(
        (await alice.get(`/api/playlists/${playlistId}`)).body.tracks[0]._id,
      ).toBe(trackId);
      expect((await bob.get(`/api/playlists/${playlistId}`)).status).toBe(404);
      expect(
        (
          await post(
            alice,
            `/api/playlists/${playlistId}`,
            csrfA,
            { name: "Renamed", visibility: "public" },
            "patch",
          )
        ).status,
      ).toBe(200);
      expect((await bob.get(`/api/playlists/${playlistId}`)).status).toBe(200);
      expect(
        (await post(alice, `/api/playlists/${playlistId}`, csrfA, {}, "delete"))
          .status,
      ).toBe(204);
    });
    it("rejects unsigned or disguised uploads", async () => {
      const res = await alice
        .post("/api/studio/upload")
        .set("Origin", "http://127.0.0.1:5173")
        .set("x-csrf-token", csrfA)
        .field("title", "Bad file")
        .field("genre", "Ambient")
        .field("moods", "[]")
        .field("license", "original")
        .field("attribution", "My own work")
        .field("rightsConfirmed", "true")
        .attach("audio", Buffer.from("not audio"), "fake.mp3");
      expect(res.status).toBe(400);
    });
    it("rejects admin escalation and invalidates sessions on logout", async () => {
      expect((await alice.get("/api/admin")).status).toBe(403);
      expect((await post(alice, "/api/auth/logout", csrfA, {})).status).toBe(
        204,
      );
      expect((await alice.get("/api/auth/me")).status).toBe(401);
    });
  },
);
