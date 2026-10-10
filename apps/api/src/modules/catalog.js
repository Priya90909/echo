import express from "express";
import { z } from "zod";
import { Track, Artist, Album } from "../models.js";
export const catalogRoutes = express.Router();
export const populateTracks = (query) => query.populate("artist", "name").populate("album", "title");
export function pagination(req) {
  const page = z.coerce.number().int().min(0).max(10000).parse(req.query.page ?? 0);
  return { skip: page * 24, limit: 24 };
}
catalogRoutes.get("/api/search", async (req, res) => {
  const text = z.string().trim().max(100).parse(req.query.q ?? "");
  const match = { $regex: text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  const artistIds = await Artist.find({ name: match }).distinct("_id");
  const filter = { published: true, $or: [{ title: match }, { genre: match }, { artist: { $in: artistIds } }] };
  if (req.query.genre) filter.genre = z.string().max(40).parse(req.query.genre);
  const { skip, limit } = pagination(req);
  const [tracks, artists, albums] = await Promise.all([populateTracks(Track.find(filter).sort({ title: 1 }).skip(skip).limit(limit)).lean(), Artist.find({ name: match }).limit(24).lean(), Album.find({ title: match }).limit(24).lean()]);
  res.json({ tracks, artists, albums });
});
for (const [kind, Model, key] of [["artists", Artist, "artist"], ["albums", Album, "album"]]) {
  catalogRoutes.get(`/api/${kind}/:id`, async (req, res) => {
    const id = z.string().regex(/^[a-f\d]{24}$/i).parse(req.params.id);
    const item = await Model.findById(id).lean();
    if (!item) return res.status(404).json({ error: "Music details not found." });
    res.json({ item, tracks: await populateTracks(Track.find({ published: true, [key]: id }).sort({ title: 1 })).lean() });
  });
}
catalogRoutes.get("/api/catalog", async (_req, res) => {
  const [tracks, genres, total] = await Promise.all([
    populateTracks(Track.find({ published: true }).sort({ title: 1 }).limit(100)).lean(),
    Track.distinct("genre", { published: true }),
    Track.countDocuments({ published: true }),
  ]);
  res.json({ tracks, genres: genres.sort(), total });
});
catalogRoutes.get("/api/tracks", async (req, res) => {
  const { skip, limit } = pagination(req);
  const filter = { published: true };
  if (req.query.genre) filter.genre = z.string().max(40).parse(req.query.genre);
  res.json(await populateTracks(Track.find(filter).sort({ title: 1 }).skip(skip).limit(limit)).lean());
});
