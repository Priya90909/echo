import mongoose, { Schema } from "mongoose";
const ref = (name, required = true) => ({
  type: Schema.Types.ObjectId,
  ref: name,
  required,
});
const make = (name, fields, indexes = []) => {
  const s = new Schema(fields, { timestamps: true });
  indexes.forEach((i) => s.index(i));
  return mongoose.model(name, s);
};
export const User = make("User", {
  googleId: { type: String, unique: true, sparse: true },
  name: { type: String, required: true, maxlength: 80 },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  role: {
    type: String,
    enum: ["listener", "artist", "admin"],
    default: "listener",
  },
  suspended: { type: Boolean, default: false },
  sessionVersion: { type: Number, default: 0 },
});
export const Session = make("Session", {
  user: ref("User"),
  tokenHash: { type: String, unique: true, required: true },
  expiresAt: { type: Date, required: true },
});
Session.schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Artist = make(
  "Artist",
  {
    owner: ref("User"),
    name: { type: String, required: true },
    bio: { type: String, default: "" },
    coverKey: String,
    cover: String,
    deletedAt: Date,
  },
  [{ owner: 1 }, { name: "text" }],
);
export const Album = make(
  "Album",
  {
    artist: ref("Artist"),
    title: { type: String, required: true },
    editorial: Boolean,
    description: String,
    coverKey: String,
    cover: String,
    deletedAt: Date,
  },
  [{ title: "text" }],
);
export const Track = make(
  "Track",
  {
    artist: ref("Artist"),
    album: ref("Album", false),
    title: { type: String, required: true },
    genre: { type: String, required: true },
    moods: [String],
    duration: { type: Number, default: 0 },
    coverKey: String,
    cover: String,
    sourceKey: String,
    mediaKey: String,
    license: {
      type: String,
      enum: ["original", "CC0", "CC-BY", "public-domain"],
      required: true,
    },
    attribution: String,
    sourceId: { type: String, unique: true, sparse: true },
    sourceUrl: String,
    licenseUrl: String,
    catalogRank: Number,
    isDemo: Boolean,
    contentHash: String,
    rightsConfirmed: Boolean,
    status: {
      type: String,
      enum: [
        "processing",
        "review",
        "published",
        "rejected",
        "unpublished",
        "failed",
      ],
      default: "processing",
    },
    playCount: { type: Number, default: 0 },
    deletedAt: Date,
  },
  [
    { title: "text", genre: "text" },
    { status: 1, createdAt: -1 },
    { artist: 1, status: 1 },
  ],
);
export const Playlist = make(
  "Playlist",
  {
    owner: ref("User"),
    name: { type: String, required: true },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
    coverKey: String,
    cover: String,
    deletedAt: Date,
  },
  [{ owner: 1, createdAt: -1 }, { name: "text" }],
);
export const PlaylistTrack = make(
  "PlaylistTrack",
  {
    playlist: ref("Playlist"),
    track: ref("Track"),
    position: { type: Number, required: true },
  },
  [{ playlist: 1, position: 1 }],
);
PlaylistTrack.schema.index({ playlist: 1, track: 1 }, { unique: true });
export const Like = make("Like", { user: ref("User"), track: ref("Track") });
Like.schema.index({ user: 1, track: 1 }, { unique: true });
export const Follow = make("Follow", {
  user: ref("User"),
  artist: ref("Artist"),
});
Follow.schema.index({ user: 1, artist: 1 }, { unique: true });
export const ListeningEvent = make(
  "ListeningEvent",
  {
    user: ref("User"),
    track: ref("Track"),
    playbackId: { type: String, required: true },
    kind: { type: String, enum: ["started", "completed"], required: true },
  },
  [
    { track: 1, createdAt: -1 },
    { user: 1, createdAt: -1 },
  ],
);
ListeningEvent.schema.index(
  { user: 1, playbackId: 1, kind: 1 },
  { unique: true },
);
export const ListeningRoom = make("ListeningRoom", {
  host: ref("User"),
  code: { type: String, unique: true },
  visibility: { type: String, enum: ["private", "public"], default: "private" },
  closedAt: Date,
});
export const RoomParticipant = make("RoomParticipant", {
  room: ref("ListeningRoom"),
  user: ref("User"),
  leftAt: Date,
});
RoomParticipant.schema.index({ room: 1, user: 1 }, { unique: true });
export const TrackReport = make("TrackReport", {
  user: ref("User"),
  track: ref("Track"),
  reason: { type: String, required: true },
  status: { type: String, enum: ["open", "resolved"], default: "open" },
});
export const UploadJob = make("UploadJob", {
  track: ref("Track"),
  status: {
    type: String,
    enum: ["queued", "processing", "completed", "failed"],
    default: "queued",
  },
  error: String,
});
export const RoomReport = make("RoomReport", {
  room: ref("ListeningRoom"),
  user: ref("User"),
  reason: { type: String, required: true },
  status: { type: String, enum: ["open", "resolved"], default: "open" },
});
