import pino from "pino";
export const logger = pino({
  redact: [
    "req.headers.cookie",
    "req.headers.authorization",
    "password",
    "passwordHash",
    "token",
    "tokenHash",
  ],
});
