import { Server } from "socket.io";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { identity } from "./auth.js";
import { config } from "./config.js";
import { Track } from "./models.js";
import { populateTracks } from "./modules/catalog.js";

export function initRooms(server) {
  const io = new Server(server, { cors: { origin: config.WEB_ORIGIN, credentials: true }, maxHttpBufferSize: 8192 });
  const rooms = new Map();
  io.use(async (socket, next) => {
    try {
      const origin = socket.handshake.headers.origin || (socket.handshake.headers.referer ? new URL(socket.handshake.headers.referer).origin : null);
      if (origin !== config.WEB_ORIGIN) throw new Error();
      const cookies = Object.fromEntries((socket.handshake.headers.cookie || "").split(";").map(value => value.trim().split("=")));
      socket.data.user = await identity(cookies.echo_access);
      next();
    } catch { next(new Error("Please sign in again to join a room.")); }
  });
  function snapshot(room) { return { code: room.code, host: room.host, members: [...room.members.values()], state: room.state }; }
  function broadcast(room) { io.to(room.code).emit("room:updated", snapshot(room)); }
  function leave(socket) {
    const room = rooms.get(socket.data.room);
    if (!room) return;
    socket.leave(room.code); socket.data.room = null; room.members.delete(socket.id);
    if (!room.members.size) rooms.delete(room.code);
    else { if (room.host === socket.id) room.host = room.members.keys().next().value; broadcast(room); }
  }
  io.on("connection", socket => {
    let count = 0, windowStart = Date.now();
    function handle(event, action) {
      socket.on(event, async (payload, ack) => {
        if (typeof ack !== "function") return;
        try {
          if (Date.now() - windowStart > 10000) { count = 0; windowStart = Date.now(); }
          if (++count > 50) throw new Error("Please wait before sending more room requests.");
          await identity(socket.handshake.headers.cookie?.split(";").map(s => s.trim()).find(s => s.startsWith("echo_access="))?.slice(12));
          if (!socket.connected) return;
          ack({ room: await action(payload) });
        } catch (error) { ack({ error: error instanceof z.ZodError ? "Invalid room request." : error.message || "Could not update room." }); }
      });
    }
    function join(room) {
      if (room.members.size >= 8) throw new Error("This room is full.");
      leave(socket); socket.join(room.code); socket.data.room = room.code;
      room.members.set(socket.id, { id: socket.id, name: socket.data.user.name }); broadcast(room);
      return snapshot(room);
    }
    handle("room:create", () => {
      let code; do { code = randomBytes(3).toString("hex").toUpperCase(); } while (rooms.has(code));
      const room = { code, host: socket.id, members: new Map(), state: null, version: 0 };
      rooms.set(code, room); return join(room);
    });
    handle("room:join", payload => {
      const code = z.string().regex(/^[A-F0-9]{6}$/).parse(payload?.code);
      const room = rooms.get(code); if (!room) throw new Error("Room not found.");
      if (socket.data.room === code) return snapshot(room);
      return join(room);
    });
    handle("room:leave", () => { leave(socket); return null; });
    handle("room:state", async payload => {
      const room = rooms.get(socket.data.room);
      if (!room || room.host !== socket.id) throw new Error("Only the room host can control shared playback.");
      const state = z.object({ track: z.string().regex(/^[a-f\d]{24}$/i), position: z.number().finite().min(0).max(86400), playing: z.boolean() }).parse(payload);
      const version = ++room.version;
      const track = await populateTracks(Track.findOne({ _id: state.track, published: true })).lean();
      if (!track) throw new Error("Song not found.");
      if (rooms.get(room.code) !== room || room.host !== socket.id || room.version !== version) return snapshot(room);
      room.state = { track, position: Math.min(state.position, track.duration), playing: state.playing, updatedAt: Date.now() };
      broadcast(room); return snapshot(room);
    });
    socket.on("disconnect", () => leave(socket));
  });
  return io;
}
