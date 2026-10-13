import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { playlistSchema } from "../../../../packages/shared/src/index.js";
import { auth } from "../auth.js";
import * as M from "../models.js";
import { published, populateTrack, id } from "./catalog-utils.js";
const app = express.Router();
app.get("/api/likes", auth, async (req, res) => {
  const likes = await M.Like.find({ user: req.user._id }).sort({
    createdAt: -1,
  });
  res.json(
    await populateTrack(
      M.Track.find({ _id: { $in: likes.map((l) => l.track) }, ...published }),
    ).lean(),
  );
});
app.put("/api/likes/:id", auth, async (req, res) => {
  if (!(await M.Track.exists({ _id: id(req.params.id), ...published })))
    return res.sendStatus(404);
  await M.Like.updateOne(
    { user: req.user._id, track: req.params.id },
    { $setOnInsert: { user: req.user._id, track: req.params.id } },
    { upsert: true },
  );
  res.sendStatus(204);
});
app.delete("/api/likes/:id", auth, async (req, res) => {
  await M.Like.deleteOne({ user: req.user._id, track: id(req.params.id) });
  res.sendStatus(204);
});
app.put("/api/follows/:id", auth, async (req, res) => {
  if (!(await M.Artist.exists({ _id: id(req.params.id), deletedAt: null })))
    return res.sendStatus(404);
  await M.Follow.updateOne(
    { user: req.user._id, artist: req.params.id },
    { $setOnInsert: { user: req.user._id, artist: req.params.id } },
    { upsert: true },
  );
  res.sendStatus(204);
});
app.delete("/api/follows/:id", auth, async (req, res) => {
  await M.Follow.deleteOne({ user: req.user._id, artist: id(req.params.id) });
  res.sendStatus(204);
});
app.get("/api/follows", auth, async (req, res) =>
  res.json(await M.Follow.find({ user: req.user._id }).populate("artist")),
);
app.get("/api/playlists", auth, async (req, res) =>
  res.json(
    await M.Playlist.find({ owner: req.user._id, deletedAt: null }).sort({
      createdAt: -1,
    }),
  ),
);
app.post("/api/playlists", auth, async (req, res) =>
  res.status(201).json(
    await M.Playlist.create({
      ...playlistSchema.parse(req.body),
      owner: req.user._id,
    }),
  ),
);
app.get("/api/playlists/:id", auth, async (req, res) => {
  const p = await M.Playlist.findOne({
    _id: id(req.params.id),
    deletedAt: null,
    $or: [{ owner: req.user._id }, { visibility: "public" }],
  });
  if (!p) return res.sendStatus(404);
  const rows = await M.PlaylistTrack.find({ playlist: p._id })
    .sort({ position: 1 })
    .populate({
      path: "track",
      match: published,
      populate: [
        { path: "artist", select: "name" },
        { path: "album", select: "title" },
      ],
    });
  res.json({ playlist: p, tracks: rows.map((r) => r.track).filter(Boolean) });
});
async function ownedPlaylist(req) {
  return M.Playlist.findOne({
    _id: id(req.params.id),
    owner: req.user._id,
    deletedAt: null,
  });
}
app.patch("/api/playlists/:id", auth, async (req, res) => {
  const p = await ownedPlaylist(req);
  if (!p) return res.sendStatus(404);
  Object.assign(p, playlistSchema.parse(req.body));
  await p.save();
  res.json(p);
});
app.delete("/api/playlists/:id", auth, async (req, res) => {
  const p = await ownedPlaylist(req);
  if (!p) return res.sendStatus(404);
  p.deletedAt = new Date();
  await p.save();
  res.sendStatus(204);
});
app.put("/api/playlists/:id/tracks", auth, async (req, res) => {
  const p = await ownedPlaylist(req);
  if (!p) return res.sendStatus(404);
  const tracks = z
    .array(z.string().regex(/^[a-f\d]{24}$/i))
    .max(500)
    .parse(req.body.tracks);
  if (new Set(tracks).size !== tracks.length)
    return res.status(400).json({ error: "Duplicate track." });
  if (
    (await M.Track.countDocuments({ _id: { $in: tracks }, ...published })) !==
    tracks.length
  )
    return res.status(400).json({ error: "A track is unavailable." });
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await M.PlaylistTrack.deleteMany({ playlist: p._id }).session(session);
      if (tracks.length)
        await M.PlaylistTrack.insertMany(
          tracks.map((track, position) => ({
            playlist: p._id,
            track,
            position,
          })),
          { session },
        );
    });
  } finally {
    await session.endSession();
  }
  res.sendStatus(204);
});
export const libraryRoutes = app;
