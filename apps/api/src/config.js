import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { z } from "zod";
let root = dirname(fileURLToPath(import.meta.url));
while (!existsSync(join(root, ".env.example")) && dirname(root) !== root)
  root = dirname(root);
dotenv.config({ path: resolve(root, ".env"), quiet: true });
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().url().default("http://127.0.0.1:5173"),
  MONGODB_URI: z
    .string()
    .default(process.env.MONGO_URI || "mongodb://localhost:27017/echo"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z
    .string()
    .min(32)
    .refine(
      (value) => !value.startsWith("replace-") && !value.startsWith("change-"),
      "Generate a random JWT_SECRET before starting ECHO.",
    ),
  S3_ENDPOINT: z.string().url().default("http://localhost:9000"),
  S3_PUBLIC_ENDPOINT: z.string().url().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default("echo"),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
});
export const config = schema.parse(process.env);
