import { MongoMemoryReplSet } from "mongodb-memory-server";
const mongo = await MongoMemoryReplSet.create({
  binary: { version: "8.0.17", downloadDir: "work/mongodb" },
  instanceOpts: [{ port: 27017 }],
  replSet: { count: 1, storageEngine: "wiredTiger" },
});
console.log("Temporary real MongoDB ready:", mongo.getUri("echo"));
console.log(
  "Data is ephemeral; Ctrl+C stops MongoDB. Redis and S3 are separate requirements.",
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, async () => {
    await mongo.stop();
    process.exit(0);
  });
