import { MongoMemoryReplSet } from "mongodb-memory-server";
import { spawn } from "node:child_process";
const mongo = await MongoMemoryReplSet.create({
  binary: {
    version: "8.0.17",
    downloadDir: process.env.MONGOMS_DOWNLOAD_DIR || "work/mongodb",
  },
  replSet: { count: 1, storageEngine: "wiredTiger" },
});
try {
  const child = spawn(
    process.execPath,
    ["node_modules/vitest/vitest.mjs", "run", "tests/integration.test.js"],
    {
      stdio: "inherit",
      env: { ...process.env, TEST_MONGODB_URI: mongo.getUri("echo_test") },
    },
  );
  process.exitCode = await new Promise((resolve) => child.on("exit", resolve));
} finally {
  await mongo.stop();
}
