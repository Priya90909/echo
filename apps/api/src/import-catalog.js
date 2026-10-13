import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "./config.js";
import { User, Artist, Album, Track } from "./models.js";
import { store, audioType } from "./storage.js";
import { catalogCover } from "./catalog-art.js";
const manifest = JSON.parse(
  await readFile(
    fileURLToPath(new URL("../catalog/licensed-tracks.json", import.meta.url)),
    "utf8",
  ),
);
const cache = resolve("work/licensed-catalog");
await mkdir(cache, { recursive: true });
await mongoose.connect(config.MONGODB_URI);
let owner = await User.findOne({ email: "licensed-catalog@echo.invalid" });
if (!owner)
  owner = await User.create({
    name: "ECHO licensed catalog",
    email: "licensed-catalog@echo.invalid",
    role: "artist",
    passwordHash: await bcrypt.hash(randomBytes(48).toString("hex"), 12),
  });
const artist = await Artist.findOneAndUpdate(
  { owner: owner._id },
  {
    $set: {
      name: "Kevin MacLeod",
      bio: "Composer of the Incompetech catalog. Tracks are credited and streamed under Creative Commons Attribution 4.0. ECHO is an independent catalog presentation and is not affiliated with or endorsed by the artist.",
    },
  },
  { upsert: true, new: true },
);
const albums = new Map();
for (const genre of new Set(manifest.map((t) => t.genre))) {
  const album = await Album.findOneAndUpdate(
    { artist: artist._id, title: `ECHO Selects · ${genre}` },
    {
      $set: {
        editorial: true,
        description:
          "An ECHO editorial collection, not an official artist album.",
      },
    },
    { upsert: true, new: true },
  );
  albums.set(genre, album);
}
let success = 0;
const failures = [];
const run = promisify(execFile);
try {
  for (const entry of manifest) {
    try {
      if (
        await Track.exists({
          sourceId: entry.isrc,
          status: "published",
          deletedAt: null,
        })
      ) {
        success++;
        continue;
      }
      const audioFile = resolve(cache, entry.isrc + ".mp3");
      let audio;
      try {
        audio = await readFile(audioFile);
      } catch {
        if (process.argv.includes("--cached")) continue;
        const source =
          "https://incompetech.com/music/royalty-free/mp3-royaltyfree/" +
          encodeURIComponent(entry.filename);
        const response = await fetch(source, {
          signal: AbortSignal.timeout(180000),
        });
        if (!response.ok)
          throw new Error(`Download returned ${response.status}`);
        audio = Buffer.from(await response.arrayBuffer());
        if (
          audio.length > 50 * 1024 * 1024 ||
          audioType(audio) !== "audio/mpeg"
        )
          throw new Error("Unexpected audio format or size");
        await writeFile(audioFile, audio);
      }
      if (audioType(audio) !== "audio/mpeg")
        throw new Error("Cached file is not MP3");
      const probe =
        process.env.FFPROBE_PATH ??
        resolve("node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe");
      let duration = entry.duration;
      if (process.platform === "win32") {
        const { stdout } = await run(
          probe,
          [
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            audioFile,
          ],
          { timeout: 10000 },
        );
        duration = Number(stdout.trim());
        if (!Number.isFinite(duration) || duration < 5)
          throw new Error("Audio duration is invalid");
      }
      const key = `licensed/incompetech/${entry.isrc}.mp3`;
      await store(key, audio, "audio/mpeg");
      const cover = await catalogCover(entry.title, entry.genre, entry.order);
      const coverKey = `covers/licensed/${entry.isrc}.webp`;
      await store(coverKey, cover, "image/webp");
      const attribution = `"${entry.title}" by Kevin MacLeod (incompetech.com). Licensed under Creative Commons Attribution 4.0: ${entry.licenseUrl} Source: ${entry.sourceUrl} Audio unchanged. Cover artwork created by ECHO; not official album artwork.`;
      const track = await Track.findOneAndUpdate(
        { sourceId: entry.isrc },
        {
          $set: {
            title: entry.title,
            artist: artist._id,
            album: albums.get(entry.genre)._id,
            genre: entry.genre,
            moods: entry.moods,
            duration,
            mediaKey: key,
            sourceKey: key,
            coverKey,
            license: "CC-BY",
            licenseUrl: entry.licenseUrl,
            attribution,
            sourceUrl: entry.sourceUrl,
            sourceId: entry.isrc,
            catalogRank: entry.order,
            isDemo: false,
            rightsConfirmed: true,
            status: "published",
            deletedAt: null,
            contentHash: createHash("sha256").update(audio).digest("hex"),
          },
        },
        { upsert: true, new: true },
      );
      track.cover = `/api/covers/tracks/${track._id}`;
      await track.save();
      const album = albums.get(entry.genre);
      if (!album.coverKey) {
        album.coverKey = coverKey;
        album.cover = `/api/covers/albums/${album._id}`;
        await album.save();
      }
      if (!artist.coverKey) {
        artist.coverKey = coverKey;
        artist.cover = `/api/covers/artists/${artist._id}`;
        await artist.save();
      }
      success++;
      console.log(
        `[${success}/${manifest.length}] ${entry.title} · ${Math.round(duration)}s`,
      );
    } catch (error) {
      failures.push(entry.title);
      console.error(
        `Import failed: ${entry.title}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
  console.log(JSON.stringify({ imported: success, failed: failures }));
  if (failures.length) process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
