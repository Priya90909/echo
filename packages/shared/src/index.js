import { z } from "zod";
export const moods = [
  "Focused",
  "Relaxed",
  "Energetic",
  "Nostalgic",
  "Happy",
  "Calm",
];
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
  password: z.string().min(12).max(128),
});
export const loginSchema = registerSchema.pick({ email: true, password: true });
export const playlistSchema = z.object({
  name: z.string().trim().min(1).max(100),
  visibility: z.enum(["public", "private"]).default("private"),
});
export const trackSchema = z.object({
  title: z.string().trim().min(1).max(120),
  genre: z.string().trim().min(1).max(40),
  moods: z.array(z.enum(moods)).max(6),
  license: z.enum(["original", "CC0", "CC-BY", "public-domain"]),
  attribution: z.string().max(1000),
  rightsConfirmed: z.literal(true),
});
export function scoreTrack(track, mood, preferences) {
  const reasons = [];
  let score = 0;
  if (track.moods.includes(mood)) {
    score += 50;
    reasons.push(`Matches ${mood.toLowerCase()} mood`);
  }
  if (preferences.genres.includes(track.genre)) {
    score += 20;
    reasons.push("A genre you enjoy");
  }
  if (preferences.artists.includes(track.artistId)) {
    score += 15;
    reasons.push("An artist you follow");
  }
  if (preferences.liked.includes(track.id)) {
    score += 10;
    reasons.push("Saved in your likes");
  }
  if (preferences.recent.includes(track.id)) {
    score -= 5;
    reasons.push("Recently played");
  }
  return { score, reasons };
}
export function roomPosition(state, now = Date.now()) {
  return Math.max(
    0,
    state.position + (state.playing ? (now - state.updatedAt) / 1000 : 0),
  );
}
