import { z } from "zod";
export const published = { status: "published", deletedAt: null };
export const populateTrack = (query) =>
  query.populate("artist", "name cover").populate("album", "title cover");
export const id = (s) =>
  z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .parse(s);
export const page = (req) => ({
  skip:
    Math.min(10000, Math.max(0, Math.floor(Number(req.query.page) || 0))) * 24,
  limit: 24,
});
