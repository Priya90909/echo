import dotenv from "dotenv";
import { resolve, dirname, join } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { spawn } from "node:child_process";
import { Redis } from "ioredis";
import { startLocalS3 } from "./local-s3.mjs";
dotenv.config({ path: ".env", quiet: true });
const children = [];
function findRedis(dir) {
  if (!existsSync(dir)) return;
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, item.name);
    if (item.name === "redis-server.exe") return resolve(file);
    if (item.isDirectory()) {
      const found = findRedis(file);
      if (found) return found;
    }
  }
}
const redisBinary = process.env.REDIS_BINARY ?? findRedis("work/tools/redis");
if (redisBinary) {
  const redis = spawn(
    redisBinary,
    [
      "--bind",
      "127.0.0.1",
      "--port",
      "6379",
      "--save",
      "",
      "--appendonly",
      "no",
      "--protected-mode",
      "yes",
    ],
    { cwd: dirname(redisBinary), windowsHide: true, stdio: "inherit" },
  );
  children.push(redis);
  redis.on("error", (error) =>
    console.error("Local Redis failed:", error.message),
  );
}
const mongo = await MongoMemoryReplSet.create({
  binary: { version: "8.0.17", downloadDir: "work/mongodb" },
  instanceOpts: [{ port: 27017 }],
  replSet: { count: 1, storageEngine: "wiredTiger" },
});
const env = {
  ...process.env,
  MONGODB_URI: mongo.getUri("echo"),
  WEB_ORIGIN: "http://127.0.0.1:5173",
  REDIS_URL: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  S3_ENDPOINT: "http://127.0.0.1:9000",
  S3_PUBLIC_ENDPOINT: "http://127.0.0.1:9000",
};
const storage = await startLocalS3({
  accessKey: env.S3_ACCESS_KEY,
  secretKey: env.S3_SECRET_KEY,
});
async function run(args) {
  const child = spawn(process.execPath, args, {
    env,
    windowsHide: true,
    stdio: "inherit",
  });
  const code = await new Promise((resolve) => child.on("exit", resolve));
  if (code !== 0) throw new Error("Command failed: " + args.join(" "));
}
await run(["apps/api/src/seed.js"]);
if (existsSync("work/licensed-catalog")) {
  await run(["apps/api/src/import-catalog.js", "--cached"]);
}
children.push(
  spawn(process.execPath, ["--watch", "apps/api/src/server.js"], {
    env,
    windowsHide: true,
    stdio: "inherit",
  }),
  spawn(
    process.execPath,
    [resolve("node_modules/vite/bin/vite.js"), "--host", "127.0.0.1"],
    { cwd: "apps/web", env, windowsHide: true, stdio: "inherit" },
  ),
);
const connection = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  connectTimeout: 1000,
  retryStrategy: () => null,
});
connection.on("error", () => {});
try {
  await connection.connect();
  await connection.ping();
  children.push(
    spawn(process.execPath, ["workers/audio-processor/src/index.js"], {
      env,
      windowsHide: true,
      stdio: "inherit",
    }),
  );
  console.log("Redis and audio worker ready.");
} catch {
  console.log(
    "Redis unavailable: listener features work, but rooms and processing need Redis.",
  );
} finally {
  connection.disconnect();
}
console.log(
  "ECHO local development: http://127.0.0.1:5173 — real temporary MongoDB, signed disk-backed media, generated demo tones. MongoDB data is ephemeral.",
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  children.forEach((c) => c.kill());
  await new Promise((resolve) => storage.close(resolve));
  await mongo.stop();
  process.exit(0);
}
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, stop);
