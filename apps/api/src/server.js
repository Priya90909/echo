import { createServer } from "node:http";
import mongoose from "mongoose";
import pino from "pino";
import { app } from "./app.js";
import { config } from "./config.js";
import { setupRooms } from "./rooms.js";
const logger = pino();
const server = createServer(app);
const { io, redis } = setupRooms(server);
app.locals.rooms = { io, redis };
mongoose.set("bufferCommands", false);
async function connect() {
  try {
    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
    });
    logger.info("MongoDB connected");
  } catch {
    logger.error(
      "MongoDB unavailable. Start local infrastructure; retrying in 10 seconds.",
    );
    retry = setTimeout(connect, 10000);
  }
}
let retry;
void connect();
server.listen(config.PORT, () =>
  logger.info({ port: config.PORT }, "ECHO API ready"),
);
async function shutdown() {
  if (retry) clearTimeout(retry);
  io.close();
  server.close();
  redis.disconnect();
  await mongoose.disconnect();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
