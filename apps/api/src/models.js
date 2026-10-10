import mongoose from "mongoose";
const { Schema } = mongoose;
const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  passwordHash: { type: String, select: false },
  role: { type: String, enum: ["listener", "artist", "admin"], default: "listener" },
  suspended: { type: Boolean, default: false },
  sessionVersion: { type: Number, default: 0 },
}, { timestamps: true });
export const User = mongoose.model("User", userSchema);
const sessionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });
export const Session = mongoose.model("Session", sessionSchema);
export const Artist = mongoose.model("Artist", new Schema({
  name: { type: String, required: true, trim: true },
  bio: { type: String, default: "" },
  owner: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true }));
export const Track = mongoose.model("Track", new Schema({
  title: { type: String, required: true, trim: true },
  artist: { type: Schema.Types.ObjectId, ref: "Artist", required: true },
  duration: { type: Number, min: 0, default: 0 },
  cover: String,
  audioKey: String,
  published: { type: Boolean, default: false },
}, { timestamps: true }));
