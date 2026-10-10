import express from "express";
import { z } from "zod";
import { Track } from "../models.js";
export const catalogRoutes = express.Router();
export const populateTracks = (query) => query.populate("artist", "name").populate("album", "title");
export function pagination(req) {
  const page = z.coerce.number().int().min(0).max(10000).parse(req.query.page ?? 0);
  return { skip: page * 24, limit: 24 };
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
