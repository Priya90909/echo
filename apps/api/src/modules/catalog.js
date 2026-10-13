import express from "express";
import { z } from "zod";
import { auth, role } from "../auth.js";
import * as M from "../models.js";
import { playback } from "../storage.js";
import { published, populateTrack, id, page } from "./catalog-utils.js";
const app = express.Router();
app.get("/api/catalog", async (_req, res) => {
  const [tracks, genres, total] = await Promise.all([
    populateTrack(
      M.Track.find(published)
        .sort({ catalogRank: 1, createdAt: -1 })
        .limit(100),
    ).lean(),
    M.Track.distinct("genre", published),
    M.Track.countDocuments(published),
  ]);
  res.json({ tracks, genres: genres.sort(), total });
});
app.get("/api/tracks", async (req, res) => {
  const { skip, limit } = page(req);
  const filter = { ...published };
  if (req.query.genre) filter.genre = z.string().max(40).parse(req.query.genre);
  res.json(
    await populateTrack(
      M.Track.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ).lean(),
  );
});
app.get("/api/search", async (req, res) => {
  const q = z
    .string()
    .max(100)
    .parse(req.query.q ?? "");
  if (!q.trim())
    return res.json({ tracks: [], artists: [], albums: [], playlists: [] });
  const term = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = { $regex: term, $options: "i" };
  const { skip, limit } = page(req);
  const artistIds = await M.Artist.find({
    name: match,
    deletedAt: null,
  }).distinct("_id");
  const genreFilter = req.query.genre
    ? { genre: z.string().max(40).parse(req.query.genre) }
    : {};
  const [tracks, artists, albums, playlists] = await Promise.all([
    populateTrack(
      M.Track.find({
        ...published,
        ...genreFilter,
        $or: [
          { title: match },
          { genre: match },
          { artist: { $in: artistIds } },
        ],
      })
        .skip(skip)
        .limit(limit),
    ).lean(),
    M.Artist.find({ name: match, deletedAt: null }).limit(limit).lean(),
    M.Album.find({ title: match, deletedAt: null }).limit(limit).lean(),
    M.Playlist.find({ name: match, visibility: "public", deletedAt: null })
      .limit(limit)
      .lean(),
  ]);
  res.json({ tracks, artists, albums, playlists });
});
app.get("/api/artists/:id", async (req, res) => {
  const artist = await M.Artist.findOne({
    _id: id(req.params.id),
    deletedAt: null,
  });
  if (!artist) return res.sendStatus(404);
  const tracks = await populateTrack(
    M.Track.find({ ...published, artist: artist._id }),
  ).lean();
  res.json({ artist, tracks });
});
app.get("/api/albums/:id", async (req, res) => {
  const album = await M.Album.findOne({
    _id: id(req.params.id),
    deletedAt: null,
  }).populate("artist", "name");
  if (!album) return res.sendStatus(404);
  res.json({
    album,
    tracks: await populateTrack(
      M.Track.find({ ...published, album: album._id }),
    ).lean(),
  });
});
app.get("/api/tracks/:id/playback", auth, async (req, res) => {
  const filter =
    req.user.role === "admin"
      ? { status: { $in: ["review", "published"] }, deletedAt: null }
      : published;
  const t = await M.Track.findOne({ _id: id(req.params.id), ...filter });
  if (!t || !t.mediaKey)
    return res.status(404).json({ error: "This track is unavailable." });
  res.json({ url: await playback(String(t.mediaKey)), expiresIn: 300 });
});
app.post("/api/tracks/:id/report", auth, async (req, res) => {
  const reason = z.string().trim().min(10).max(1000).parse(req.body.reason);
  if (!(await M.Track.exists({ _id: id(req.params.id), ...published })))
    return res.sendStatus(404);
  res.status(201).json(
    await M.TrackReport.create({
      user: req.user._id,
      track: req.params.id,
      reason,
    }),
  );
});
export const catalogRoutes = app;
