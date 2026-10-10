import express from "express";
import bcrypt from "bcryptjs";
import { registerSchema, loginSchema, } from "../schemas.js";
import { auth, issueSession, clearSession, hash, publicUser, } from "../auth.js";
import * as M from "../models.js";
const app = express.Router();
app.post("/api/auth/register", async (req, res) => {
    const data = registerSchema.parse(req.body);
    const user = await M.User.create({
        ...data,
        password: undefined,
        passwordHash: await bcrypt.hash(data.password, 12),
    });
    await issueSession(res, user);
    res.status(201).json(publicUser(user));
});
app.post("/api/auth/login", async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = await M.User.findOne({ email: data.email }).select("+passwordHash");
    if (!user ||
        user.suspended ||
        !(await bcrypt.compare(data.password, String(user.passwordHash))))
        return res.status(401).json({ error: "Email or password is incorrect." });
    await issueSession(res, user);
    res.json(publicUser(user));
});
app.post("/api/auth/refresh", async (req, res) => {
    const token = req.cookies.echo_refresh;
    if (!token)
        return res.status(401).json({ error: "Session expired." });
    const session = await M.Session.findOneAndDelete({
        tokenHash: hash(token),
        expiresAt: { $gt: new Date() },
    });
    if (!session)
        return res.status(401).json({ error: "Session expired." });
    const user = await M.User.findById(session.user);
    if (!user || user.suspended)
        return res.sendStatus(401);
    await issueSession(res, user);
    res.json(publicUser(user));
});
app.get("/api/auth/me", auth, (req, res) => res.json(publicUser(req.user)));
app.post("/api/auth/logout", auth, async (req, res) => {
    await M.User.updateOne({ _id: req.user._id }, { $inc: { sessionVersion: 1 } });
    await M.Session.deleteMany({ user: req.user._id });
    clearSession(res);
    res.sendStatus(204);
});
export const authenticationRoutes = app;
