import express from "express";
import mongoose from "mongoose";
import helmet from "helmet";
import cors from "cors";
import { ZodError } from "zod";
import { config } from "./config.js";
import { logger } from "./logger.js";
export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: config.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: "32kb" }));
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => logger.info({ method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - start }, "request"));
  next();
});
app.get("/api/health", (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ service: "echo-api", database: connected ? "connected" : "unavailable" });
});
app.use((_req, res) => res.status(404).json({ error: "Endpoint not found." }));
app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) return res.status(400).json({ error: "Validation failed.", details: err.flatten() });
  if (err.code === 11000) return res.status(409).json({ error: "This record already exists." });
  logger.error({ name: err.name, code: err.code }, "Request failed");
  res.status(500).json({ error: "The service could not complete this request." });
});
