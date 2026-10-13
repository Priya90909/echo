import { Worker } from "bullmq";
import mongoose from "mongoose";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpeg from "ffmpeg-static";
import ffprobe from "ffprobe-static";
import { config } from "../../../apps/api/src/config.js";
import { Track, UploadJob } from "../../../apps/api/src/models.js";
import { s3, store } from "../../../apps/api/src/storage.js";
const run = promisify(execFile);
await mongoose.connect(config.MONGODB_URI);
const worker = new Worker(
  "audio",
  async (job) => {
    const track = await Track.findById(job.data.trackId);
    if (!track) throw new Error("Track missing");
    const dir = await mkdtemp(join(tmpdir(), "echo-audio-"));
    try {
      await UploadJob.updateOne(
        { _id: job.data.jobId },
        { status: "processing", error: null },
      );
      const object = await s3.send(
        new GetObjectCommand({
          Bucket: config.S3_BUCKET,
          Key: String(track.sourceKey),
        }),
      );
      const source = join(dir, "source");
      const output = join(dir, "audio.mp3");
      await writeFile(source, await object.Body.transformToByteArray());
      await run(
        process.env.FFMPEG_PATH ?? ffmpeg ?? "ffmpeg",
        [
          "-nostdin",
          "-v",
          "error",
          "-y",
          "-i",
          source,
          "-vn",
          "-map_metadata",
          "-1",
          "-ac",
          "2",
          "-ar",
          "44100",
          "-codec:a",
          "libmp3lame",
          "-b:a",
          "192k",
          output,
        ],
        { timeout: 180000, maxBuffer: 1024 * 1024 },
      );
      const { stdout } = await run(
        process.env.FFPROBE_PATH ?? ffprobe.path,
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          output,
        ],
        { timeout: 10000 },
      );
      const key = `audio/${track._id}.mp3`;
      await store(key, await readFile(output), "audio/mpeg");
      await Track.updateOne(
        { _id: track._id },
        { mediaKey: key, duration: Number(stdout.trim()), status: "review" },
      );
      await UploadJob.updateOne(
        { _id: job.data.jobId },
        { status: "completed", error: null },
      );
    } catch (e) {
      await UploadJob.updateOne(
        { _id: job.data.jobId },
        {
          status: "failed",
          error: e instanceof Error ? e.message : "Processing failed",
        },
      );
      await Track.updateOne({ _id: track._id }, { status: "failed" });
      throw e;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
  { connection: { url: config.REDIS_URL }, concurrency: 2 },
);
worker.on("failed", (job, error) =>
  console.error({ job: job?.id, error: error.message }),
);
const stop = async () => {
  await worker.close();
  await mongoose.disconnect();
  process.exit(0);
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
