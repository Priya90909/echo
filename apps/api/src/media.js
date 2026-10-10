import express from "express";
import { resolve, sep } from "node:path";
import { auth } from "./auth.js";
import { Track } from "./models.js";
import { z } from "zod";
export const mediaRoutes = express.Router();
const mediaRoot = resolve("work/audio");
function mediaPath(key) {
  const path = resolve(mediaRoot, key);
  if (!path.startsWith(mediaRoot + sep)) throw Error("Invalid media path");
  return path;
}
mediaRoutes.get("/api/tracks/:id/playback", auth, async (req, res) => {
  const id = z.string().regex(/^[a-f\d]{24}$/i).parse(req.params.id);
  const track = await Track.findOne({ _id: id, published: true });
  if (!track?.audioKey) return res.status(404).json({ error: "Audio is not available for this song yet." });
  mediaPath(track.audioKey);
  res.json({ url: `/api/tracks/${id}/audio` });
});
mediaRoutes.get("/api/tracks/:id/audio", auth, async (req, res, next) => {
  const id = z.string().regex(/^[a-f\d]{24}$/i).parse(req.params.id);
  const track = await Track.findOne({ _id: id, published: true });
  if (!track?.audioKey) return res.status(404).json({ error: "Audio is unavailable." });
  // sendFile handles byte ranges, allowing the browser to seek without loading the whole file.
  res.sendFile(mediaPath(track.audioKey), error => { if (error) next(error); });
});
