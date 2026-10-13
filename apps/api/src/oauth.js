import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { User } from "./models.js";
import { issueSession } from "./auth.js";
export const oauth = Router();
const clientId = process.env.GOOGLE_CLIENT_ID,
  clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callback = process.env.GOOGLE_CALLBACK_URL;
const enabled = !!(clientId && clientSecret && callback);
const cookie = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/auth/google",
  maxAge: 10 * 60000,
};
oauth.get("/providers", (_req, res) => res.json({ google: enabled }));
oauth.get("/google", (_req, res) => {
  if (!enabled)
    return res.status(503).json({ error: "Google sign-in is not configured." });
  const state = randomBytes(32).toString("hex"),
    nonce = randomBytes(32).toString("hex"),
    verifier = randomBytes(48).toString("base64url");
  res.cookie("echo_oauth", JSON.stringify({ state, nonce, verifier }), cookie);
  const client = new OAuth2Client(clientId, clientSecret, callback);
  const url = client.generateAuthUrl({
    scope: ["openid", "email", "profile"],
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  });
  const parsed = new URL(url);
  parsed.searchParams.set("nonce", nonce);
  res.redirect(parsed.toString());
});
oauth.get("/google/callback", async (req, res) => {
  try {
    if (!enabled) throw new Error("Google sign-in is not configured.");
    const saved = JSON.parse(req.cookies.echo_oauth ?? "{}"),
      state = String(req.query.state ?? "");
    res.clearCookie("echo_oauth", cookie);
    if (
      !/^[a-f\d]{64}$/.test(state) ||
      !saved.state ||
      state.length !== saved.state.length ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(saved.state))
    )
      throw new Error("Invalid OAuth state.");
    if (typeof req.query.code !== "string")
      throw new Error("Google did not return a code.");
    const client = new OAuth2Client(clientId, clientSecret, callback);
    const { tokens } = await client.getToken({
      code: req.query.code,
      codeVerifier: saved.verifier,
    });
    if (!tokens.id_token) throw new Error("No identity token returned.");
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (
      !payload?.email_verified ||
      !payload.email ||
      payload.nonce !== saved.nonce
    )
      throw new Error("Google identity could not be verified.");
    let user = await User.findOne({ googleId: payload.sub });
    if (!user) {
      if (await User.exists({ email: payload.email.toLowerCase() }))
        throw new Error(
          "An email/password account already exists. Sign in with your password.",
        );
      user = await User.create({
        name: payload.name ?? "Listener",
        email: payload.email.toLowerCase(),
        googleId: payload.sub,
        passwordHash: await bcrypt.hash(randomBytes(48).toString("hex"), 12),
      });
    }
    if (user.suspended) throw new Error("Account suspended.");
    await issueSession(res, user);
    res.redirect(config.WEB_ORIGIN + "/home");
  } catch {
    res.redirect(config.WEB_ORIGIN + "/login?error=google");
  }
});
