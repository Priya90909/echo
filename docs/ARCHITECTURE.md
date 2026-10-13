# Architecture and data

The browser calls one same-origin API. React Query owns server data; Zustand owns playback state. A single module-level Audio element persists through internal routes. Signed playback URLs expire after five minutes; selecting a failed track again requests a new URL. Playback errors, loading states and service failures are displayed. Media Session supports metadata and play/pause/skip controls. Keyboard seeking uses five-second intervals.

The API performs authorization before issuing media URLs. Audio bytes flow directly from storage to the browser with range requests; Express only receives source uploads (50 MB maximum). Uploads use random object keys and signature inspection, then BullMQ schedules FFmpeg. The worker strips embedded metadata, encodes stereo MP3, extracts duration and moves the track to review. Retries use exponential backoff. A curator can publish only processed tracks with rights confirmation. This is a modular monolith with grouped authentication, catalog, library, listening, studio, and administration routes.

## Collections

All models have creation/update timestamps. User: unique email, password hash excluded by default, listener/artist/admin role, suspension, session version. Session: hashed refresh token, user reference, expiry with TTL. Artist: user owner, name, biography, soft deletion. Track: artist/album refs, moods/genre, license and attribution, rights assertion, source/playback object keys, duration, processing/publication status, qualified play count, soft deletion. Album: title, artist, optional cover, soft deletion. Playlist: owner, visibility, optional cover, soft deletion. PlaylistTrack: playlist/track pair unique, sortable numeric position. Like and Follow: unique user/track and user/artist pairs. ListeningEvent: user/track/playback UUID, started/completed kind, unique user/playback/kind tuple. ListeningRoom: host, invite code, visibility, closure. RoomParticipant: unique room/user membership and departure time. TrackReport: track, reporter, reason, resolution status. UploadJob: track, processing state and error.

Catalog indexes cover text search and status/date queries; history indexes cover track/date and user/date. Library membership has unique indexes. Playlist order replacement uses MongoDB transactions. Schema definitions use Mongoose and input uses Zod. Model typing and module boundaries should be tightened before a production release.

## Security

Bcrypt cost 12. JWT access cookies last 15 minutes; refresh cookies last seven days and reference hashed, single-use refresh records. Logout invalidates all sessions via session version. Cookies are HTTP-only and SameSite Lax, Secure in production. Mutations require exact Origin and a server-issued CSRF token sent as a header. Login, general API, uploads and socket actions are limited. Listener role cannot be chosen at registration. Artist profile creation enables the artist role; publication stays admin-only. Artist edits always filter by owner. Suspension invalidates API sessions and socket actions recheck authentication. Socket authentication is cookie-only and Origin restricted.

Uploaded MIME headers are not trusted. Signature inspection is a first check; FFmpeg is the decoder validation boundary. Production must run FFmpeg in an isolated non-root container with resource limits. Original uploads are quarantined in a private bucket. URLs grant temporary bearer access; unpublishing prevents new URLs, but an existing five-minute URL remains usable until expiry.

## MoodFlow

Score = 50 for mood compatibility + 20 for liked genre + 15 for followed artist + 10 for liked track − 5 for recent play. Equal scores break by stable track ID. Each contribution produces a human-readable reason. Cold start uses mood compatibility alone. No paid AI or random ranking. Current candidates are capped at 1,000; production should select candidates with indexed queries and add cached result invalidation.

## Rooms

Redis holds queue, index, host, position, playing flag, update timestamp and revision for 24 hours. State changes require the host, current revision and a Redis lock with token-checked release. The server checks that queue items are published. Socket.IO delivers authoritative state, participants and ephemeral chat. Client computes elapsed playback from server time and corrects drift over 1.5 seconds, polls every five seconds and rejoins via URL invite after reconnect. Room cap: 20 sockets; chat: five messages per ten seconds. Browser autoplay policy still requires a user gesture in some browsers. This initial implementation is single API instance; multiple instances require Socket.IO Redis adapter, distributed presence and measured round-trip clock offsets.

## Analytics

Client emits a started event after ten seconds or half the track duration, whichever is shorter. Unique event keys reduce replay duplication, and completed events are separate. Artist views expose aggregate daily counts and track totals, never individual histories. This limits simple duplicates but is not fraud-resistant telemetry: server-issued playback sessions and rate-based anomaly checks are still needed.
