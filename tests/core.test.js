import { describe, it, expect } from "vitest";
import request from "supertest";
import {
  scoreTrack,
  roomPosition,
  registerSchema,
  trackSchema,
} from "../packages/shared/src/index.js";
import { app } from "../apps/api/src/app.js";
import { audioType } from "../apps/api/src/storage.js";
describe("recommendations", () => {
  const track = {
    id: "1",
    artistId: "a",
    genre: "Ambient",
    moods: ["Focused"],
  };
  it("explains a deterministic weighted score", () => {
    const result = scoreTrack(track, "Focused", {
      genres: ["Ambient"],
      artists: ["a"],
      liked: ["1"],
      recent: ["1"],
    });
    expect(result.score).toBe(90);
    expect(result.reasons).toHaveLength(5);
    expect(result).toEqual(
      scoreTrack(track, "Focused", {
        genres: ["Ambient"],
        artists: ["a"],
        liked: ["1"],
        recent: ["1"],
      }),
    );
  });
  it("handles cold start", () =>
    expect(
      scoreTrack(track, "Calm", {
        genres: [],
        artists: [],
        liked: [],
        recent: [],
      }).score,
    ).toBe(0));
});
describe("room clock", () => {
  it("advances active playback", () =>
    expect(
      roomPosition({ position: 12, playing: true, updatedAt: 1000 }, 4500),
    ).toBe(15.5));
  it("keeps paused playback still", () =>
    expect(
      roomPosition({ position: 12, playing: false, updatedAt: 1000 }, 4500),
    ).toBe(12));
  it("clamps negative positions", () =>
    expect(
      roomPosition({ position: 0, playing: true, updatedAt: 5000 }, 1000),
    ).toBe(0));
});
describe("validation", () => {
  it("rejects weak passwords", () =>
    expect(
      registerSchema.safeParse({
        name: "Test",
        email: "test@example.com",
        password: "short",
      }).success,
    ).toBe(false));
  it("requires rights confirmation", () =>
    expect(
      trackSchema.safeParse({
        title: "Track",
        genre: "Ambient",
        moods: [],
        license: "original",
        attribution: "Me",
        rightsConfirmed: false,
      }).success,
    ).toBe(false));
  it("rejects disguised non-audio uploads", () =>
    expect(audioType(Buffer.from("<script>bad</script>"))).toBeNull());
  it("identifies WAV signature", () => {
    const wav = Buffer.alloc(44);
    wav.write("RIFF");
    wav.write("WAVE", 8);
    expect(audioType(wav)).toBe("audio/wav");
  });
});
describe("HTTP boundary", () => {
  it("rejects anonymous private access", async () => {
    expect((await request(app).get("/api/playlists")).status).toBe(401);
  });
  it("rejects anonymous playback access", async () => {
    expect(
      (await request(app).get("/api/tracks/aaaaaaaaaaaaaaaaaaaaaaaa/playback"))
        .status,
    ).toBe(401);
  });
  it("rejects cross-origin mutations before DB access", async () => {
    expect(
      (
        await request(app)
          .post("/api/auth/register")
          .set("Origin", "https://attacker.invalid")
          .send({})
      ).status,
    ).toBe(403);
  });
  it("issues CSRF tokens in a restricted cookie", async () => {
    const res = await request(app).get("/api/auth/csrf");
    expect(res.body.token).toMatch(/^[a-f\d]{64}$/);
    expect(res.headers["set-cookie"][0]).toContain("HttpOnly");
  });
  it("reports unavailable infrastructure honestly", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body.database).toBe("unavailable");
  });
});
