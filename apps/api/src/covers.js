import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { auth, identity } from "./auth.js";
import { Artist, Track, Album, Playlist } from "./models.js";
import { store, playback } from "./storage.js";
export const covers = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
const models = {
  tracks: Track,
  albums: Album,
  artists: Artist,
  playlists: Playlist,
};
const parse = (req) => ({
  kind: z
    .enum(["tracks", "albums", "artists", "playlists"])
    .parse(req.params.kind),
  id: z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .parse(req.params.id),
});
covers.post(
  "/studio/covers/:kind/:id",
  auth,
  upload.single("cover"),
  async (req, res) => {
    const { kind, id } = parse(req);
    const record = await models[kind].findOne({ _id: id, deletedAt: null });
    if (!record) return res.sendStatus(404);
    const artist =
      kind === "tracks" || kind === "albums"
        ? await Artist.findById(record.artist)
        : null;
    const owner = artist?.owner ?? record.owner;
    if (String(owner) !== String(req.user._id)) return res.sendStatus(404);
    if (!req.file)
      return res.status(400).json({ error: "Choose a cover image." });
    const image = sharp(req.file.buffer, {
      limitInputPixels: 20_000_000,
      animated: false,
    });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? ""))
      return res.status(400).json({ error: "Use JPEG, PNG or WebP." });
    const buffer = await image
      .rotate()
      .resize(640, 640, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();
    const key = `covers/${kind}/${id}/${randomUUID()}.webp`;
    await store(key, buffer, "image/webp");
    record.coverKey = key;
    record.cover = `/api/covers/${kind}/${id}`;
    await record.save();
    res.json({ cover: record.cover });
  },
);
covers.get("/covers/:kind/:id", async (req, res) => {
  const { kind, id } = parse(req);
  const filter = { _id: id, deletedAt: null };
  if (kind === "tracks") filter.status = "published";
  const record = await models[kind].findOne(filter);
  if (kind === "playlists" && record?.visibility === "private") {
    const user = await identity(req.cookies.echo_access ?? "").catch(
      () => null,
    );
    if (!user || String(record.owner) !== String(user._id))
      return res.sendStatus(404);
  }
  if (!record?.coverKey) return res.sendStatus(404);
  res.setHeader("Cache-Control", "private, max-age=120");
  res.redirect(await playback(record.coverKey));
});
