// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, it, expect, vi } from "vitest";
vi.mock("../apps/web/src/api", () => ({
  api: vi.fn(async () => ({ url: "http://localhost/test.wav" })),
  json: JSON.stringify,
}));
import { api } from "../apps/web/src/api.js";
import { usePlayer } from "../apps/web/src/player.js";
const tracks = [
  {
    _id: "1",
    title: "One",
    artist: { _id: "a", name: "Artist" },
    genre: "Ambient",
    moods: ["Focused"],
    duration: 30,
    status: "published",
    license: "original",
    attribution: "Test",
    playCount: 0,
  },
  {
    _id: "2",
    title: "Two",
    artist: { _id: "a", name: "Artist" },
    genre: "Ambient",
    moods: [],
    duration: 30,
    status: "published",
    license: "original",
    attribution: "Test",
    playCount: 0,
  },
];
beforeAll(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(
    async function () {
      this.dispatchEvent(new Event("playing"));
    },
  );
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function () {
    this.dispatchEvent(new Event("pause"));
  });
});
beforeEach(() => {
  vi.mocked(api)
    .mockReset()
    .mockResolvedValue({ url: "http://localhost/test.wav" });
  usePlayer.setState({
    track: null,
    queue: [],
    index: 0,
    playing: false,
    loading: false,
    error: "",
    shuffle: false,
    repeat: "off",
  });
});
describe("single player controller", () => {
  it("keeps the selected track and ordered queue across subscriptions", async () => {
    await usePlayer.getState().play(tracks, 1);
    expect(usePlayer.getState().track?._id).toBe("2");
    expect(usePlayer.getState().queue).toEqual(tracks);
    expect(api).toHaveBeenCalledWith("/tracks/2/playback");
    expect(usePlayer.getState().playing).toBe(true);
  });
  it("does not let an older playback URL replace a newer selection", async () => {
    let resolve;
    vi.mocked(api).mockImplementationOnce(
      () => new Promise((r) => (resolve = r)),
    );
    const older = usePlayer.getState().play(tracks, 0);
    await usePlayer.getState().play(tracks, 1);
    resolve({ url: "http://localhost/old.wav" });
    await older;
    expect(usePlayer.getState().track?._id).toBe("2");
    expect(usePlayer.getState().playing).toBe(true);
  });
  it("exposes a failed authorized media request", async () => {
    vi.mocked(api).mockRejectedValueOnce(
      new Error("This track is unavailable."),
    );
    await usePlayer.getState().play(tracks);
    expect(usePlayer.getState().playing).toBe(false);
    expect(usePlayer.getState().loading).toBe(false);
    expect(usePlayer.getState().error).toBe("This track is unavailable.");
  });
  it("cycles repeat modes and keeps volume in state", () => {
    const s = usePlayer.getState();
    s.setRepeat();
    expect(usePlayer.getState().repeat).toBe("all");
    s.setRepeat();
    expect(usePlayer.getState().repeat).toBe("one");
    s.setRepeat();
    expect(usePlayer.getState().repeat).toBe("off");
    s.setVolume(0.3);
    expect(usePlayer.getState().volume).toBe(0.3);
  });
});
