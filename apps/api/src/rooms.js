import { Server } from "socket.io";
import { Redis } from "ioredis";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { config } from "./config.js";
import { identity } from "./auth.js";
import { Track, ListeningRoom, RoomParticipant, RoomReport } from "./models.js";
import { roomPosition } from "../../../packages/shared/src/index.js";
export function setupRooms(server) {
  const io = new Server(server, {
    cors: { origin: config.WEB_ORIGIN, credentials: true },
    allowRequest: (req, cb) => {
      // Same-origin polling GETs may omit Origin; require their same-origin Referer.
      let origin = req.headers.origin;
      if (!origin && req.headers.referer) {
        try {
          origin = new URL(req.headers.referer).origin;
        } catch {}
      }
      cb(null, origin === config.WEB_ORIGIN);
    },
  });
  const redis = new Redis(config.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  redis.on("error", () => {});
  io.use(async (socket, next) => {
    try {
      const raw = socket.handshake.headers.cookie ?? "";
      const token = raw
        .split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith("echo_access="))
        ?.slice(12);
      socket.data.user = await identity(token ?? "");
      next();
    } catch {
      next(new Error("Sign in to join a room."));
    }
  });
  const stateKey = (code) => `echo:room:${code}`;
  io.on("connection", (socket) => {
    const actionTimes = [];
    const guarded = (handler) => async (data, ack) => {
      try {
        const now = Date.now();
        while (actionTimes.length && actionTimes[0] < now - 10000)
          actionTimes.shift();
        if (actionTimes.length >= 30) throw new Error("Slow down.");
        actionTimes.push(now);
        socket.data.user = await identity(
          socket.handshake.headers.cookie
            ?.split(";")
            .map((s) => s.trim())
            .find((s) => s.startsWith("echo_access="))
            ?.slice(12) ?? "",
        );
        const result = await handler(data);
        if (typeof ack === "function") ack({ ok: true, ...result });
      } catch (e) {
        if (typeof ack === "function")
          ack({
            ok: false,
            error: e instanceof Error ? e.message : "Room unavailable.",
          });
      }
    };
    const participants = async (code) => {
      const sockets = await io.in(code).fetchSockets();
      io.to(code).emit(
        "participants",
        sockets.map((s) => ({
          id: s.id,
          user: String(s.data.user._id),
          name: s.data.user.name,
        })),
      );
    };
    socket.on(
      "create",
      guarded(async () => {
        const code = randomBytes(4).toString("hex");
        const state = {
          host: String(socket.data.user._id),
          queue: [],
          index: 0,
          position: 0,
          playing: false,
          updatedAt: Date.now(),
          revision: 0,
        };
        await ListeningRoom.create({ host: socket.data.user._id, code });
        await redis.set(stateKey(code), JSON.stringify(state), "EX", 86400);
        return { code };
      }),
    );
    socket.on(
      "join",
      guarded(async (data) => {
        const code = z
          .string()
          .regex(/^[a-f\d]{8}$/)
          .parse(data.code);
        const state = await redis.get(stateKey(code));
        if (!state) throw new Error("Room expired or unavailable.");
        const members = await io.in(code).fetchSockets();
        if (members.length >= 20 && !members.some((s) => s.id === socket.id))
          throw new Error("Room is full.");
        if (socket.data.code) {
          await socket.leave(socket.data.code);
          await participants(socket.data.code);
        }
        await socket.join(code);
        socket.data.code = code;
        const room = await ListeningRoom.findOne({ code });
        await RoomParticipant.updateOne(
          { room: room._id, user: socket.data.user._id },
          { $set: { leftAt: null } },
          { upsert: true },
        );
        await participants(code);
        return { state: JSON.parse(state), serverTime: Date.now() };
      }),
    );
    socket.on(
      "control",
      guarded(async (data) => {
        const code = socket.data.code;
        if (!code) throw new Error("Join a room first.");
        const command = z
          .object({
            playing: z.boolean().optional(),
            position: z.number().min(0).max(86400).optional(),
            queue: z
              .array(z.string().regex(/^[a-f\d]{24}$/i))
              .max(100)
              .optional(),
            index: z.number().int().min(0).max(99).optional(),
            revision: z.number().int(),
          })
          .parse(data);
        const lock = stateKey(code) + ":lock";
        const lockToken = randomBytes(16).toString("hex");
        if (!(await redis.set(lock, lockToken, "PX", 3000, "NX")))
          throw new Error("Room is updating; retry.");
        try {
          const raw = await redis.get(stateKey(code));
          if (!raw) throw new Error("Room expired.");
          const state = JSON.parse(raw);
          if (state.host !== String(socket.data.user._id))
            throw new Error("Only the host controls playback.");
          if (command.revision !== state.revision)
            throw new Error("Room state changed; synchronize and retry.");
          if (
            command.queue &&
            (await Track.countDocuments({
              _id: { $in: command.queue },
              status: "published",
              deletedAt: null,
            })) !== new Set(command.queue).size
          )
            throw new Error("Queue contains unavailable music.");
          const now = Date.now();
          state.position = command.position ?? roomPosition(state, now);
          state.playing = command.playing ?? state.playing;
          if (command.queue) state.queue = command.queue;
          if (command.index !== undefined) {
            state.index = command.index;
            state.position = command.position ?? 0;
          }
          if (state.index >= state.queue.length && state.queue.length)
            throw new Error("Invalid queue position.");
          state.updatedAt = now;
          state.revision++;
          await redis.set(stateKey(code), JSON.stringify(state), "EX", 86400);
          io.to(code).emit("state", { state, serverTime: now });
          return { state, serverTime: now };
        } finally {
          await redis.eval(
            "if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",
            1,
            lock,
            lockToken,
          );
        }
      }),
    );
    socket.on(
      "sync",
      guarded(async () => {
        const raw = await redis.get(stateKey(socket.data.code));
        if (!raw) throw new Error("Room expired.");
        return { state: JSON.parse(raw), serverTime: Date.now() };
      }),
    );
    const chatTimes = [];
    socket.on(
      "report",
      guarded(async (data) => {
        const reason = z.string().trim().min(10).max(1000).parse(data.reason);
        if (!socket.data.code) throw new Error("Join a room first.");
        const room = await ListeningRoom.findOne({
          code: socket.data.code,
          closedAt: null,
        });
        if (!room) throw new Error("Room unavailable.");
        await RoomReport.create({
          room: room._id,
          user: socket.data.user._id,
          reason,
        });
        return {};
      }),
    );
    socket.on(
      "chat",
      guarded(async (data) => {
        const text = z.string().trim().min(1).max(500).parse(data.text);
        const now = Date.now();
        while (chatTimes.length && chatTimes[0] < now - 10000)
          chatTimes.shift();
        if (chatTimes.length >= 5) throw new Error("Chat rate limit reached.");
        if (!socket.data.code) throw new Error("Join a room first.");
        chatTimes.push(now);
        io.to(socket.data.code).emit("chat", {
          name: socket.data.user.name,
          text,
          at: now,
        });
        return {};
      }),
    );
    socket.on("disconnect", async () => {
      if (socket.data.code) {
        await participants(socket.data.code);
        const room = await ListeningRoom.findOne({ code: socket.data.code });
        if (room)
          await RoomParticipant.updateOne(
            { room: room._id, user: socket.data.user._id },
            { leftAt: new Date() },
          );
      }
    });
  });
  return { io, redis };
}
