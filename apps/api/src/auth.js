import jwt from "jsonwebtoken";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";
import { User, Session } from "./models.js";
export const hash = (s) => createHash("sha256").update(s).digest("hex");
const cookie = {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
};
export async function issueSession(res, user) {
    const refresh = randomBytes(48).toString("hex");
    await Session.create({
        user: user._id,
        tokenHash: hash(refresh),
        expiresAt: new Date(Date.now() + 7 * 86400000),
    });
    res.cookie("echo_refresh", refresh, { ...cookie, maxAge: 7 * 86400000 });
    accessCookie(res, user);
}
export function accessCookie(res, user) {
    res.cookie("echo_access", jwt.sign({ sub: String(user._id), version: user.sessionVersion }, config.JWT_SECRET, { expiresIn: "15m", issuer: "echo", audience: "echo-web" }), { ...cookie, path: "/", maxAge: 15 * 60000 });
}
export async function identity(token) {
    const p = jwt.verify(token, config.JWT_SECRET, {
        issuer: "echo",
        audience: "echo-web",
    });
    const u = await User.findById(p.sub);
    if (!u || u.suspended || u.sessionVersion !== p.version)
        throw new Error("Invalid session");
    return u;
}
export async function auth(req, res, next) {
    try {
        req.user = await identity(req.cookies.echo_access);
        next();
    }
    catch {
        res.status(401).json({ error: "Please sign in again." });
    }
}
export const role = (...roles) => (req, res, next) => roles.includes(req.user.role)
    ? next()
    : res
        .status(403)
        .json({ error: "This action requires a permitted role." });
export function csrf(req, res, next) {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method))
        return next();
    const a = req.cookies.echo_csrf, b = req.get("x-csrf-token");
    if (req.get("origin") !== config.WEB_ORIGIN ||
        typeof a !== "string" ||
        typeof b !== "string" ||
        !/^([a-f\d]{64})$/.test(a) ||
        !/^([a-f\d]{64})$/.test(b) ||
        !timingSafeEqual(Buffer.from(a), Buffer.from(b)))
        return res
            .status(403)
            .json({ error: "Invalid request origin or CSRF token." });
    next();
}
export function publicUser(u) {
    return { _id: u._id, name: u.name, email: u.email, role: u.role };
}
export function clearSession(res) {
    res.clearCookie("echo_access", { ...cookie, path: "/" });
    res.clearCookie("echo_refresh", cookie);
}
