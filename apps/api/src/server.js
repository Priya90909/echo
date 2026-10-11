import mongoose from "mongoose";
import { createServer } from "node:http";
import { initRooms } from "./rooms.js";
import { app } from "./app.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
try {
  await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  const server = createServer(app);
  const io = initRooms(server);
  server.listen(config.PORT, "127.0.0.1", () => logger.info({ port: config.PORT }, "ECHO API ready"));
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => io.close(async () => { await mongoose.disconnect(); process.exit(0); }));
  }
} catch (error) {
  logger.error({ name: error.name }, "Could not connect to MongoDB. Check MONGO_URI and start MongoDB.");
  process.exitCode = 1;
}
