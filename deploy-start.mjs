import { spawn } from "node:child_process";

// A free service sleeps when idle; processing resumes when the service wakes.
const children = [
  spawn(process.execPath, ["apps/api/src/server.js"], { stdio: "inherit" }),
];
if (process.env.ECHO_RUN_WORKER === "true") {
  children.push(
    spawn(process.execPath, ["workers/audio-processor/src/index.js"], {
      stdio: "inherit",
    }),
  );
}
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 5000);
}
for (const child of children) {
  child.on("error", () => stop(1));
  child.on("exit", (code) => stop(code ?? 1));
}
process.on("SIGTERM", () => stop(0));
process.on("SIGINT", () => stop(0));
