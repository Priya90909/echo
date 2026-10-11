import express from "express";
import { z } from "zod";
import { auth } from "../auth.js";
import { ListenEvent, Track } from "../models.js";
import { populateTracks } from "./catalog.js";
export const listeningRoutes = express.Router();
listeningRoutes.post("/api/events", auth, async (req, res) => {
  const data = z.object({ track: z.string().regex(/^[a-f\d]{24}$/i), seconds: z.number().min(1).max(86400), listenId: z.string().uuid() }).parse(req.body);
  if (!await Track.exists({ _id: data.track, published: true })) return res.status(404).json({ error: "Song not found." });
  await ListenEvent.updateOne({ user: req.user._id, listenId: data.listenId }, { $setOnInsert: { ...data, user: req.user._id } }, { upsert: true });
  res.sendStatus(204);
});
listeningRoutes.get("/api/history", auth, async (req, res) => {
  const events = await ListenEvent.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
  const ids = [...new Set(events.map(event => String(event.track)))];
  const tracks = await populateTracks(Track.find({ published: true, _id: { $in: ids } })).lean();
  res.json(ids.map(id => tracks.find(track => String(track._id) === id)).filter(Boolean));
});
const moods = { calm: ["Ambient", "Jazz"], focus: ["Ambient", "Electronic"], energy: ["Electronic", "Rock", "Pop"], reflective: ["Jazz", "Piano", "Ambient"] };
listeningRoutes.get("/api/moods", (_req, res) => res.json(Object.keys(moods)));
listeningRoutes.get("/api/moodflow", async (req, res) => {
  const mood = z.enum(["calm", "focus", "energy", "reflective"]).parse(req.query.mood);
  res.json(await populateTracks(Track.find({ published: true, genre: { $in: moods[mood] } }).sort({ title: 1 }).limit(50)).lean());
});
