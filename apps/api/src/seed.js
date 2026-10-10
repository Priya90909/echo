import mongoose from "mongoose";
import { config } from "./config.js";
import { Artist, Album, Track } from "./models.js";
// Metadata fixtures only. Actual playback is introduced in stage 7.
try {
  await mongoose.connect(config.MONGO_URI);
  const artist = await Artist.findOneAndUpdate({ name: "ECHO Demo" }, { $set: { bio: "Sample catalog for developing ECHO." } }, { upsert: true, new: true });
  const album = await Album.findOneAndUpdate({ title: "First Frequencies", artist: artist._id }, { $set: { cover: "/covers/ambient.svg" } }, { upsert: true, new: true });
  const songs = [["Morning Light", "Ambient", 185], ["City After Dark", "Electronic", 214], ["Slow Sunday", "Jazz", 198], ["Ocean Air", "Ambient", 242], ["Neon Walk", "Electronic", 176], ["Window Seat", "Jazz", 203]];
  for (const [title, genre, duration] of songs) {
    await Track.updateOne({ title, artist: artist._id }, { $set: { genre, duration, album: album._id, cover: `/covers/${genre.toLowerCase()}.svg`, published: true } }, { upsert: true });
  }
  console.log("Seeded 6 demo tracks without changing existing catalog entries.");
} finally { await mongoose.disconnect(); }
