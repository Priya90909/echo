import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Queue } from "bullmq";
import { config } from "./config.js";
export const s3 = new S3Client({
  endpoint: config.S3_ENDPOINT,
  region: config.S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_KEY,
  },
});
const publicS3 = new S3Client({
  endpoint: config.S3_PUBLIC_ENDPOINT,
  region: config.S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_KEY,
  },
});
let queue;
export function audioQueue() {
  return (queue ??= new Queue("audio", {
    connection: { url: config.REDIS_URL },
  }));
}
export const store = (key, body, type) =>
  s3.send(
    new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: type,
    }),
  );
export const playback = (key) =>
  getSignedUrl(
    publicS3,
    new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key }),
    { expiresIn: 300 },
  );
export function audioType(buffer) {
  if (
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WAVE"
  )
    return "audio/wav";
  if (
    buffer.subarray(0, 3).toString() === "ID3" ||
    (buffer[0] === 255 && (buffer[1] & 224) === 224)
  )
    return "audio/mpeg";
  if (buffer.subarray(0, 4).toString() === "fLaC") return "audio/flac";
  if (buffer.subarray(0, 4).toString() === "OggS") return "audio/ogg";
  return null;
}
