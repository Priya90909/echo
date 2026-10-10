import "dotenv/config";
import { z } from "zod";
const env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGO_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//).default("mongodb://127.0.0.1:27017/echo"),
  WEB_ORIGIN: z.string().url().default("http://127.0.0.1:5173"),
  JWT_SECRET: z.string().min(32).refine((value) => !value.startsWith("replace-"), "Generate a random JWT_SECRET; do not use the example placeholder."),
}).parse(process.env);
export const config = env;
