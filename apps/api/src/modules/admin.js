import express from "express";
import { z } from "zod";
import { auth, role } from "../auth.js";
import * as M from "../models.js";
import { published, id } from "./catalog-utils.js";
const app = express.Router();
app.get("/api/admin", auth, role("admin"), async (_req, res) =>
  res.json({
    tracks: await M.Track.find({ status: "review" }).populate("artist", "name"),
    reports: await M.TrackReport.find({ status: "open" }).populate(
      "track",
      "title",
    ),
    users: await M.User.find().select("name email role suspended").limit(100),
    roomReports: await M.RoomReport.find({ status: "open" }).populate(
      "room",
      "code",
    ),
    metrics: {
      users: await M.User.countDocuments(),
      published: await M.Track.countDocuments(published),
      plays: await M.ListeningEvent.countDocuments({ kind: "started" }),
    },
  }),
);
app.patch("/api/admin/tracks/:id", auth, role("admin"), async (req, res) => {
  const data = z
    .object({ status: z.enum(["published", "rejected", "unpublished"]) })
    .parse(req.body);
  const t = await M.Track.findOne({ _id: id(req.params.id) });
  if (!t) return res.sendStatus(404);
  if (data.status === "published" && (!t.mediaKey || !t.rightsConfirmed))
    return res
      .status(400)
      .json({ error: "Processing and rights confirmation are required." });
  t.status = data.status;
  await t.save();
  res.json(t);
});
app.patch("/api/admin/reports/:id", auth, role("admin"), async (req, res) => {
  await M.TrackReport.updateOne(
    { _id: id(req.params.id) },
    { status: "resolved" },
  );
  res.sendStatus(204);
});
app.patch("/api/admin/users/:id", auth, role("admin"), async (req, res) => {
  const suspended = z.boolean().parse(req.body.suspended);
  if (String(req.user._id) === id(req.params.id))
    return res.status(400).json({ error: "Cannot suspend your own account." });
  await M.User.updateOne(
    { _id: req.params.id },
    { $set: { suspended }, $inc: { sessionVersion: 1 } },
  );
  await M.Session.deleteMany({ user: req.params.id });
  res.sendStatus(204);
});
export const adminRoutes = app;
app.patch("/api/admin/rooms/:code", auth, role("admin"), async (req, res) => {
  const code = z
    .string()
    .regex(/^[a-f\d]{8}$/)
    .parse(req.params.code);
  const room = await M.ListeningRoom.findOneAndUpdate(
    { code },
    { closedAt: new Date() },
    { new: true },
  );
  if (!room) return res.sendStatus(404);
  const service = req.app.locals.rooms;
  if (!service)
    return res.status(503).json({ error: "Room service unavailable." });
  await service.redis.del(`echo:room:${code}`);
  service.io.to(code).emit("closed");
  service.io.in(code).disconnectSockets(true);
  await M.RoomReport.updateMany({ room: room._id }, { status: "resolved" });
  res.sendStatus(204);
});
