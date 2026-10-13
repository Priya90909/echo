import express from "express";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { trackSchema, moods } from "../../../../packages/shared/src/index.js";
import { auth, role, accessCookie } from "../auth.js";
import * as M from "../models.js";
import { store, audioType, audioQueue } from "../storage.js";
import { id } from "./catalog-utils.js";
const app = express.Router();
app.get("/api/studio", auth, async (req, res) => {
  const artist = await M.Artist.findOne({
    owner: req.user._id,
    deletedAt: null,
  });
  res.json({
    artist,
    tracks: artist
      ? await M.Track.find({ artist: artist._id, deletedAt: null }).sort({
          createdAt: -1,
        })
      : [],
  });
});
app.post("/api/studio/profile", auth, async (req, res) => {
  const data = z
    .object({
      name: z.string().trim().min(2).max(80),
      bio: z.string().max(2000),
    })
    .parse(req.body);
  const a = await M.Artist.findOneAndUpdate(
    { owner: req.user._id },
    { $set: data },
    { upsert: true, new: true },
  );
  if (req.user.role === "listener") {
    req.user.role = "artist";
    await req.user.save();
    accessCookie(res, req.user);
  }
  res.status(201).json(a);
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1, fields: 8 },
});
app.post(
  "/api/studio/upload",
  auth,
  role("artist", "admin"),
  rateLimit({ windowMs: 3600000, limit: 10 }),
  upload.single("audio"),
  async (req, res) => {
    const data = trackSchema.parse({
      ...req.body,
      moods: JSON.parse(req.body.moods ?? "[]"),
      rightsConfirmed: req.body.rightsConfirmed === "true",
    });
    const artist = await M.Artist.findOne({
      owner: req.user._id,
      deletedAt: null,
    });
    if (!artist)
      return res.status(400).json({ error: "Create an artist profile first." });
    if (!req.file)
      return res.status(400).json({ error: "Choose an audio file." });
    const type = audioType(req.file.buffer);
    if (!type)
      return res.status(400).json({
        error: "Unsupported audio signature. Use WAV, MP3, FLAC or OGG.",
      });
    const key = `sources/${req.user._id}/${randomUUID()}`;
    await store(key, req.file.buffer, type);
    const track = await M.Track.create({
      ...data,
      artist: artist._id,
      sourceKey: key,
    });
    const job = await M.UploadJob.create({ track: track._id });
    try {
      await audioQueue().add(
        "process",
        { trackId: String(track._id), jobId: String(job._id) },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      );
    } catch (e) {
      track.status = "failed";
      await track.save();
      job.status = "failed";
      job.error = "Unable to enqueue processing";
      await job.save();
      throw e;
    }
    res.status(202).json(track);
  },
);
app.patch(
  "/api/studio/tracks/:id",
  auth,
  role("artist", "admin"),
  async (req, res) => {
    const artist = await M.Artist.findOne({ owner: req.user._id });
    if (!artist) return res.sendStatus(404);
    const data = z
      .object({
        title: z.string().min(1).max(120).optional(),
        status: z.literal("unpublished").optional(),
      })
      .parse(req.body);
    const t = await M.Track.findOneAndUpdate(
      { _id: id(req.params.id), artist: artist._id },
      data,
      { new: true },
    );
    if (!t) return res.sendStatus(404);
    res.json(t);
  },
);
app.post(
  "/api/studio/albums",
  auth,
  role("artist", "admin"),
  async (req, res) => {
    const artist = await M.Artist.findOne({ owner: req.user._id });
    if (!artist) return res.sendStatus(404);
    const data = z
      .object({
        title: z.string().min(1).max(120),
        tracks: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(100),
      })
      .parse(req.body);
    if (
      (await M.Track.countDocuments({
        _id: { $in: data.tracks },
        artist: artist._id,
      })) !== data.tracks.length
    )
      return res.sendStatus(403);
    const album = await M.Album.create({
      title: data.title,
      artist: artist._id,
    });
    await M.Track.updateMany(
      { _id: { $in: data.tracks }, artist: artist._id },
      { album: album._id },
    );
    res.status(201).json(album);
  },
);
app.get(
  "/api/studio/analytics",
  auth,
  role("artist", "admin"),
  async (req, res) => {
    const a = await M.Artist.findOne({ owner: req.user._id });
    const tracks = await M.Track.find({ artist: a?._id }).select(
      "title playCount",
    );
    const daily = await M.ListeningEvent.aggregate([
      {
        $match: {
          track: { $in: tracks.map((t) => t._id) },
          kind: "started",
          createdAt: { $gte: new Date(Date.now() - 30 * 86400000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          plays: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const unique = await M.ListeningEvent.distinct("user", {
      track: { $in: tracks.map((t) => t._id) },
      kind: "started",
    });
    const [likes, followers] = await Promise.all([
      M.Like.countDocuments({ track: { $in: tracks.map((t) => t._id) } }),
      M.Follow.countDocuments({ artist: a?._id }),
    ]);
    res.json({
      uniqueListeners: unique.length >= 5 ? unique.length : null,
      likes,
      followers,
      totalPlays: tracks.reduce((sum, t) => sum + Number(t.playCount), 0),
      tracks,
      daily,
    });
  },
);
export const studioRoutes = app;
