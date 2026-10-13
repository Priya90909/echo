import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import mongoose from "mongoose";
import multer from "multer";
import { randomBytes } from "node:crypto";
import { ZodError } from "zod";
import { config } from "./config.js";
import { auth, csrf } from "./auth.js";
import { oauth } from "./oauth.js";
import { covers } from "./covers.js";
import { logger } from "./logger.js";
import { authenticationRoutes } from "./modules/authentication.js";
import { catalogRoutes } from "./modules/catalog.js";
import { libraryRoutes } from "./modules/library.js";
import { listeningRoutes } from "./modules/listening.js";
import { studioRoutes } from "./modules/studio.js";
import { adminRoutes } from "./modules/admin.js";
export const app = express();
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () =>
    logger.info(
      {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - start,
      },
      "request",
    ),
  );
  next();
});
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: config.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.get("/api/health", (_req, res) =>
  res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({
    service: "echo-api",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "unavailable",
  }),
);
app.get("/api/auth/csrf", (req, res) => {
  const existing = req.cookies.echo_csrf;
  const token =
    typeof existing === "string" && /^[a-f\d]{64}$/.test(existing)
      ? existing
      : randomBytes(32).toString("hex");
  res.set("Cache-Control", "no-store");
  res.cookie("echo_csrf", token, {
    secure: config.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
    httpOnly: true,
  });
  res.json({ token });
});
app.use(
  "/api",
  csrf,
  rateLimit({
    windowMs: 60000,
    limit: 180,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
app.use("/api/auth", rateLimit({ windowMs: 15 * 60000, limit: 40 }), oauth);
app.use("/api", covers);
app.use(authenticationRoutes);
app.use(catalogRoutes);
app.use(libraryRoutes);
app.use(listeningRoutes);
app.use(studioRoutes);
app.use(adminRoutes);
app.use((_req, res) => res.status(404).json({ error: "Endpoint not found." }));
app.use((err, _req, res, _next) => {
  if (err instanceof ZodError)
    return res
      .status(400)
      .json({ error: "Validation failed.", details: err.flatten() });
  if (err.code === 11000)
    return res.status(409).json({ error: "This record already exists." });
  if (err instanceof multer.MulterError)
    return res.status(400).json({ error: err.message });
  logger.error({ name: err.name, code: err.code }, "Request failed");
  res.status(503).json({
    error: "The service could not complete this request. Please retry.",
  });
});
