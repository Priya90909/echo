import express from "express";
import mongoose from "mongoose";
import helmet from "helmet";
import cors from "cors";
import { ZodError } from "zod";
import { config } from "./config.js";
import { logger } from "./logger.js";
import cookieParser from "cookie-parser";
import { randomBytes } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { csrf } from "./auth.js";
import { authenticationRoutes } from "./modules/authentication.js";
export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: config.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => logger.info({ method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - start }, "request"));
  next();
});
app.get("/api/health", (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ service: "echo-api", database: connected ? "connected" : "unavailable" });
});
app.get("/api/auth/csrf", (_req, res) => {
  const token = randomBytes(32).toString("hex");
  res.cookie("echo_csrf", token, { httpOnly: true, secure: config.NODE_ENV === "production", sameSite: "lax", path: "/api" });
  res.json({ token });
});
app.use("/api", csrf, rateLimit({ windowMs: 60000, limit: 180 }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60000, limit: 40 }));
app.use(authenticationRoutes);
app.use((_req, res) => res.status(404).json({ error: "Endpoint not found." }));
app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) return res.status(400).json({ error: "Validation failed.", details: err.flatten() });
  if (err.code === 11000) return res.status(409).json({ error: "This record already exists." });
  logger.error({ name: err.name, code: err.code }, "Request failed");
  res.status(500).json({ error: "The service could not complete this request." });
});
