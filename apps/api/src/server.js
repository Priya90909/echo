import mongoose from "mongoose";
import { app } from "./app.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
try {
  await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  const server = app.listen(config.PORT, "127.0.0.1", () => logger.info({ port: config.PORT }, "ECHO API ready"));
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => server.close(async () => { await mongoose.disconnect(); process.exit(0); }));
  }
} catch (error) {
  logger.error({ name: error.name }, "Could not connect to MongoDB. Check MONGO_URI and start MongoDB.");
  process.exitCode = 1;
}
