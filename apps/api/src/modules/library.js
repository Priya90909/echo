import express from "express";
import { z } from "zod";
import { auth } from "../auth.js";
import { Like, Playlist, Track } from "../models.js";
import { populateTracks } from "./catalog.js";
export const libraryRoutes = express.Router();
const id = z.string().regex(/^[a-f\d]{24}$/i);
libraryRoutes.get("/api/likes", auth, async (req, res) => {
  const likes = await Like.find({ user: req.user._id }).lean();
  res.json(await populateTracks(Track.find({ published: true, _id: { $in: likes.map(value => value.track) } })).lean());
});
libraryRoutes.put("/api/likes/:id", auth, async (req, res) => {
  const track = id.parse(req.params.id);
  if (!await Track.exists({ _id: track, published: true })) return res.status(404).json({ error: "Song not found." });
  await Like.updateOne({ user: req.user._id, track }, { $setOnInsert: { user: req.user._id, track } }, { upsert: true });
  res.sendStatus(204);
});
libraryRoutes.delete("/api/likes/:id", auth, async (req, res) => { await Like.deleteOne({ user: req.user._id, track: id.parse(req.params.id) }); res.sendStatus(204); });
libraryRoutes.get("/api/playlists", auth, async (req, res) => res.json(await Playlist.find({ owner: req.user._id, deletedAt: null }).sort({ createdAt: -1 }).lean()));
libraryRoutes.post("/api/playlists", auth, async (req, res) => res.status(201).json(await Playlist.create({ name: z.string().trim().min(1).max(80).parse(req.body.name), owner: req.user._id })));
libraryRoutes.get("/api/playlists/:id", auth, async (req, res) => {
  const playlist = await Playlist.findOne({ _id: id.parse(req.params.id), owner: req.user._id, deletedAt: null }).lean();
  if (!playlist) return res.status(404).json({ error: "Playlist not found." });
  const songs = await populateTracks(Track.find({ published: true, _id: { $in: playlist.tracks } })).lean();
  res.json({ playlist, tracks: playlist.tracks.map(value => songs.find(song => String(song._id) === String(value))).filter(Boolean) });
});
libraryRoutes.put("/api/playlists/:id/tracks", auth, async (req, res) => {
  const tracks = z.array(id).max(500).parse(req.body.tracks);
  if (new Set(tracks).size !== tracks.length) return res.status(400).json({ error: "Duplicate song." });
  if (await Track.countDocuments({ _id: { $in: tracks }, published: true }) !== tracks.length) return res.status(400).json({ error: "A song is unavailable." });
  const playlist = await Playlist.findOneAndUpdate({ _id: id.parse(req.params.id), owner: req.user._id, deletedAt: null }, { $set: { tracks } }, { new: true });
  if (!playlist) return res.status(404).json({ error: "Playlist not found." });
  res.json(playlist);
});
libraryRoutes.delete("/api/playlists/:id", auth, async (req, res) => {
  const result = await Playlist.updateOne({ _id: id.parse(req.params.id), owner: req.user._id, deletedAt: null }, { $set: { deletedAt: new Date() } });
  if (!result.matchedCount) return res.status(404).json({ error: "Playlist not found." });
  res.sendStatus(204);
});
