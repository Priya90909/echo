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
  genre: { type: String, default: "Ambient" },
  album: { type: Schema.Types.ObjectId, ref: "Album" },
  audioKey: String,
  published: { type: Boolean, default: false },
}, { timestamps: true }));
export const Album = mongoose.model("Album", new Schema({
  title: { type: String, required: true },
  artist: { type: Schema.Types.ObjectId, ref: "Artist", required: true },
  cover: String,
}, { timestamps: true }));
const likeSchema = new Schema({ user: { type: Schema.Types.ObjectId, ref: "User", required: true }, track: { type: Schema.Types.ObjectId, ref: "Track", required: true } }, { timestamps: true });
likeSchema.index({ user: 1, track: 1 }, { unique: true });
export const Like = mongoose.model("Like", likeSchema);
export const Playlist = mongoose.model("Playlist", new Schema({ name: { type: String, required: true, maxlength: 80 }, owner: { type: Schema.Types.ObjectId, ref: "User", required: true }, tracks: [{ type: Schema.Types.ObjectId, ref: "Track" }], deletedAt: { type: Date, default: null } }, { timestamps: true }));
const eventSchema = new Schema({ user: { type: Schema.Types.ObjectId, ref: "User", required: true }, track: { type: Schema.Types.ObjectId, ref: "Track", required: true }, seconds: { type: Number, min: 1, required: true }, listenId: { type: String, required: true } }, { timestamps: true });
eventSchema.index({ user: 1, listenId: 1 }, { unique: true });
export const ListenEvent = mongoose.model("ListenEvent", eventSchema);
