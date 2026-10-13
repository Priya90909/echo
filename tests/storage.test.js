import { beforeAll, afterAll, it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { startLocalS3 } from "../scripts/local-s3.mjs";
let server, root, client, url;
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "echo-storage-test-"));
  server = await startLocalS3({
    port: 0,
    accessKey: "local-test",
    secretKey: "local-secret-only",
    root,
  });
  url = `http://127.0.0.1:${server.address().port}`;
  client = new S3Client({
    endpoint: url,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: "local-test",
      secretAccessKey: "local-secret-only",
    },
  });
});
afterAll(async () => {
  client.destroy();
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
});
it("stores bytes through real SigV4 S3 requests and supports signed range playback", async () => {
  await client.send(new CreateBucketCommand({ Bucket: "echo" }));
  await client.send(new HeadBucketCommand({ Bucket: "echo" }));
  await client.send(
    new PutObjectCommand({
      Bucket: "echo",
      Key: "demo/space track.wav",
      Body: Buffer.from("0123456789"),
      ContentType: "audio/wav",
    }),
  );
  const signed = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: "echo", Key: "demo/space track.wav" }),
    { expiresIn: 300 },
  );
  const response = await fetch(signed, { headers: { Range: "bytes=3-6" } });
  expect(response.status).toBe(206);
  expect(response.headers.get("content-range")).toBe("bytes 3-6/10");
  expect(await response.text()).toBe("3456");
  const tampered = await fetch(signed.replace("space%20track", "other"));
  expect(tampered.status).toBe(403);
  expect((await fetch(url + "/echo/demo/space%20track.wav")).status).toBe(403);
});
