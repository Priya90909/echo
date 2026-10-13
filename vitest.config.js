import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  test: {
    maxWorkers: 2,
    fileParallelism: false,
    include: ["tests/**/*.test.{js,jsx}"],
    env: {
      NODE_ENV: "test",
      WEB_ORIGIN: "http://127.0.0.1:5173",
      JWT_SECRET: "echo-test-secret-32-characters-long-only",
      S3_ACCESS_KEY: "test",
      S3_SECRET_KEY: "test",
    },
  },
});
