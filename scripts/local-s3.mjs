/** Development-only S3 subset with SigV4 authentication, disk persistence and byte ranges. */
import { createServer } from "node:http";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { resolve, sep, dirname } from "node:path";
const encode = (value) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
const sha = (value) => createHash("sha256").update(value).digest("hex");
const hmac = (key, value) => createHmac("sha256", key).update(value).digest();
export async function startLocalS3({
  port = 9000,
  accessKey,
  secretKey,
  root = "work/local-s3",
  origin = "http://127.0.0.1:5173",
}) {
  if (process.env.NODE_ENV === "production")
    throw new Error("Local storage cannot run in production");
  const base = resolve(root);
  await mkdir(base, { recursive: true });
  const server = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Accept-Ranges, Content-Range, Content-Length",
    );
    res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, PUT, OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const fail = (status, message) => {
      res.writeHead(status, { "Content-Type": "application/xml" });
      res.end(`<Error><Code>${message}</Code></Error>`);
    };
    try {
      const url = new URL(req.url, `http://${req.headers.host}`),
        query = url.searchParams;
      const presigned = query.has("X-Amz-Signature");
      let credential, signedHeaders, signature, date, payloadHash;
      if (presigned) {
        credential = query.get("X-Amz-Credential");
        signedHeaders = query.get("X-Amz-SignedHeaders");
        signature = query.get("X-Amz-Signature");
        date = query.get("X-Amz-Date");
        payloadHash = query.get("X-Amz-Content-Sha256") ?? "UNSIGNED-PAYLOAD";
      } else {
        const match =
          /^AWS4-HMAC-SHA256 Credential=([^,]+), SignedHeaders=([^,]+), Signature=([a-f\d]{64})$/.exec(
            req.headers.authorization ?? "",
          );
        if (!match) {
          fail(403, "AccessDenied");
          return;
        }
        [, credential, signedHeaders, signature] = match;
        date = req.headers["x-amz-date"];
        payloadHash = req.headers["x-amz-content-sha256"];
      }
      if (
        typeof date !== "string" ||
        !/^\d{8}T\d{6}Z$/.test(date) ||
        typeof signedHeaders !== "string" ||
        typeof credential !== "string" ||
        typeof signature !== "string"
      ) {
        fail(403, "AccessDenied");
        return;
      }
      const timestamp = Date.parse(
          `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${date.slice(9, 11)}:${date.slice(11, 13)}:${date.slice(13, 15)}Z`,
        ),
        expires = presigned ? Number(query.get("X-Amz-Expires")) : 900;
      if (
        !Number.isFinite(expires) ||
        expires < 1 ||
        expires > 900 ||
        timestamp > Date.now() + 60000 ||
        Date.now() > timestamp + expires * 1000
      ) {
        fail(403, "ExpiredToken");
        return;
      }
      const [key, day, region, service, terminal] = credential.split("/");
      if (
        key !== accessKey ||
        service !== "s3" ||
        terminal !== "aws4_request" ||
        day !== date.slice(0, 8)
      ) {
        fail(403, "AccessDenied");
        return;
      }
      const canonicalQuery = [...query.entries()]
        .filter(([k]) => k !== "X-Amz-Signature")
        .map(([k, v]) => [encode(k), encode(v)])
        .sort((a, b) =>
          a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1,
        )
        .map(([k, v]) => `${k}=${v}`)
        .join("&");
      const canonicalHeaders = signedHeaders
        .split(";")
        .map(
          (k) =>
            `${k}:${String(req.headers[k] ?? "")
              .trim()
              .replace(/\s+/g, " ")}\n`,
        )
        .join("");
      const canonical = [
        req.method,
        url.pathname,
        canonicalQuery,
        canonicalHeaders,
        signedHeaders,
        payloadHash,
      ].join("\n");
      const scope = `${day}/${region}/s3/aws4_request`;
      const signingKey = hmac(
        hmac(hmac(hmac("AWS4" + secretKey, day), region), service),
        "aws4_request",
      );
      const expected = hmac(
        signingKey,
        `AWS4-HMAC-SHA256\n${date}\n${scope}\n${sha(canonical)}`,
      ).toString("hex");
      if (
        !/^[a-f\d]{64}$/.test(signature) ||
        !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
      ) {
        fail(403, "SignatureDoesNotMatch");
        return;
      }
      const parts = decodeURIComponent(url.pathname).split("/").filter(Boolean);
      if (
        !parts.length ||
        parts.some(
          (p) =>
            p === "." || p === ".." || p.includes("\\") || p.includes("\0"),
        )
      ) {
        fail(400, "InvalidKey");
        return;
      }
      const target = resolve(base, ...parts);
      if (!target.startsWith(base + sep)) {
        fail(400, "InvalidKey");
        return;
      }
      if (req.method === "PUT") {
        if (parts.length === 1) {
          await mkdir(target, { recursive: true });
          res.writeHead(200);
          res.end();
          return;
        }
        const buffers = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 51 * 1024 * 1024) {
            fail(413, "EntityTooLarge");
            return;
          }
          buffers.push(chunk);
        }
        const body = Buffer.concat(buffers);
        if (
          /^[a-f\d]{64}$/.test(payloadHash ?? "") &&
          sha(body) !== payloadHash
        ) {
          fail(400, "BadDigest");
          return;
        }
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, body);
        await writeFile(
          target + ".echo-meta",
          String(req.headers["content-type"] ?? "application/octet-stream"),
        );
        res.writeHead(200, { ETag: `"${sha(body)}"` });
        res.end();
        return;
      }
      if (!["HEAD", "GET"].includes(req.method)) {
        fail(405, "MethodNotAllowed");
        return;
      }
      const info = await stat(target);
      if (info.isDirectory()) {
        res.writeHead(200);
        res.end();
        return;
      }
      if (parts.at(-1).endsWith(".echo-meta")) {
        fail(404, "NoSuchKey");
        return;
      }
      let type = "application/octet-stream";
      try {
        type = await readFile(target + ".echo-meta", "utf8");
      } catch {}
      res.setHeader("Content-Type", type);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "private, max-age=60");
      const range = req.headers.range;
      if (range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(range);
        if (!match) {
          res.writeHead(416, { "Content-Range": `bytes */${info.size}` });
          res.end();
          return;
        }
        const start = Number(match[1]),
          end = match[2]
            ? Math.min(Number(match[2]), info.size - 1)
            : info.size - 1;
        if (start >= info.size || end < start) {
          res.writeHead(416, { "Content-Range": `bytes */${info.size}` });
          res.end();
          return;
        }
        res.writeHead(206, {
          "Content-Length": end - start + 1,
          "Content-Range": `bytes ${start}-${end}/${info.size}`,
        });
        if (req.method === "HEAD") res.end();
        else res.end((await readFile(target)).subarray(start, end + 1));
      } else {
        res.writeHead(200, { "Content-Length": info.size });
        if (req.method === "HEAD") res.end();
        else res.end(await readFile(target));
      }
    } catch (error) {
      fail(
        error.code === "ENOENT" ? 404 : 500,
        error.code === "ENOENT" ? "NoSuchKey" : "InternalError",
      );
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return server;
}
