import { readFile, writeFile } from "node:fs/promises";

// Deployment-only adapter: the compiled API serves the built frontend on one origin.
const file = "apps/api/src/app.js";
let source = await readFile(file, "utf8");
const marker = "app.use((_req, res) => res.status(404)";
if (!source.includes(marker))
  throw new Error("API fallback changed; review deployment adapter.");
source = 'import { resolve } from "node:path";\n' + source;
source = source.replace(
  'app.disable("x-powered-by");',
  'app.disable("x-powered-by");\napp.set("trust proxy", 1);',
);
source = source.replace(
  "app.use(helmet());",
  `app.use(helmet({ contentSecurityPolicy: { directives: {
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "media-src": ["'self'", "blob:", new URL(config.S3_PUBLIC_ENDPOINT).origin],
  "connect-src": ["'self'", new URL(config.S3_PUBLIC_ENDPOINT).origin],
  "worker-src": ["'self'", "blob:"]
} } }));`,
);
source = source.replace(
  marker,
  `app.use(express.static(resolve("apps/web/dist")));
app.get("/{*path}", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path === "/api") return next();
  res.sendFile(resolve("apps/web/dist/index.html"));
});
${marker}`,
);
await writeFile(file, source);
console.log("Prepared frontend and API for one deployment origin.");
