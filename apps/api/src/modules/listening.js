import express from "express";
import { z } from "zod";
import { scoreTrack, moods } from "../../../../packages/shared/src/index.js";
import { auth } from "../auth.js";
import * as M from "../models.js";
import { published, populateTrack, id } from "./catalog-utils.js";
const app = express.Router();
app.post("/api/events", auth, async (req, res) => {
  const data = z
    .object({
      track: z.string().regex(/^[a-f\d]{24}$/i),
      playbackId: z.string().uuid(),
      kind: z.enum(["started", "completed"]),
    })
    .parse(req.body);
  if (!(await M.Track.exists({ _id: data.track, ...published })))
    return res.sendStatus(404);
  const result = await M.ListeningEvent.updateOne(
    { user: req.user._id, ...data },
    { $setOnInsert: { user: req.user._id, ...data } },
    { upsert: true },
  );
  if (result.upsertedCount && data.kind === "started")
    await M.Track.updateOne({ _id: data.track }, { $inc: { playCount: 1 } });
  res.sendStatus(204);
});
app.get("/api/history", auth, async (req, res) =>
  res.json(
    await M.ListeningEvent.find({ user: req.user._id, kind: "started" })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate({
        path: "track",
        match: published,
        populate: { path: "artist", select: "name" },
      }),
  ),
);
app.get("/api/recommendations", auth, async (req, res) => {
  const mood = z.enum(moods).parse(req.query.mood ?? "Focused");
  const [tracks, likes, follows, history] = await Promise.all([
    populateTrack(M.Track.find(published).limit(1000)).lean(),
    M.Like.find({ user: req.user._id }).populate("track"),
    M.Follow.find({ user: req.user._id }),
    M.ListeningEvent.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30),
  ]);
  const preferences = {
    genres: likes.map((l) => l.track?.genre).filter(Boolean),
    artists: follows.map((f) => String(f.artist)),
    liked: likes.map((l) => String(l.track?._id)),
    recent: history.map((e) => String(e.track)),
  };
  res.json(
    tracks
      .map((t) => ({
        ...t,
        ...scoreTrack(
          {
            id: String(t._id),
            artistId: String(t.artist._id),
            genre: t.genre,
            moods: t.moods,
          },
          mood,
          preferences,
        ),
      }))
      .sort(
        (a, b) =>
          b.score - a.score || String(a._id).localeCompare(String(b._id)),
      )
      .slice(0, 24),
  );
});
export const listeningRoutes = app;
