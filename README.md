# ECHO

A music app built with React, JavaScript, Vite and Express.

## Current progress

Stages 1–11: workspace foundation, responsive visual shell, MongoDB-backed API, and account registration/sign-in. Authentication includes hashed passwords, HTTP-only access and refresh cookies, session rotation, CSRF checks, rate limiting and sign-out.

Catalog discovery, search, artist/album details and native audio playback are implemented. Queue, shuffle, repeat and an expanded player are available. Likes, private playlists, listening history and MoodFlow are available. Offline music comes in a later stage.

## Run locally

Requires Node.js 22.12 or newer and Docker (or a running MongoDB instance).

```sh
npm ci
docker compose up -d
```

Copy `.env.example` to `apps/api/.env`. Generate a random secret with:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Replace the example JWT_SECRET in your local file with that value. The example placeholder is deliberately rejected. Do not commit the local .env file.

```sh
npm run dev
```

Web: http://127.0.0.1:5173

API health: http://127.0.0.1:4000/api/health

The API connects to MongoDB before listening. The health endpoint returns 200 when connected and 503 when disconnected. If changing ports, update WEB_ORIGIN and the Vite API proxy accordingly. Run the API from its workspace directory so dotenv reads apps/api/.env; npm workspace scripts handle this automatically.

## Build

```sh
npm run build
```

The JavaScript API runs directly with `npm start -w @echo/api`. Production requires HTTPS for secure session cookies and separately configured MongoDB, secrets and allowed origin.

## Account flow

Create an account at /register, then use the name and Sign out control in the top bar. Passwords must contain 12–128 characters. Sign in at /login. Account identity survives a page reload, and refresh cookies renew expired access sessions. Sign-out revokes the user's current sessions.

Downloaded music, local environment files, dependencies and generated builds are excluded from Git. Stages after 11 remain outside this snapshot.

## Stage 5 — catalog and discovery
Run npm run seed after configuring the local API environment to add six demo song records and bundled SVG covers. Home loads published tracks from MongoDB with loading, error and empty states. These fixtures contain metadata only; playback is introduced in stage 7.


## Stage 6 — search and detail pages
Search song titles, artists and genres; filter by genre and page through results. Artist and album links open catalog detail pages. Playback is added in the next stage.


## Stage 7 — native playback
Run npm run seed again to generate an original 15-second WAV demo melody locally. All demo tracks use this test audio; it is not a commercial song download. Sign in to play, pause, seek and change volume. Audio is served through authenticated byte-range requests. Files under work/ stay out of Git.


## Stage 8 — queue and expanded player
Song cards start a queue from the displayed list. Use next/previous, shuffle and repeat off/all/one, select a track from Up next, and expand the player. Close the expanded view with its close button or Escape; playback stays shared with the bottom bar.


## Stage 9 — likes and playlists
Signed-in listeners can save songs using the expanded or bottom player heart. Create a playlist in Your library, then add a song using the icon beside the expanded-player close control. Playlists are private to their owner; duplicate tracks are rejected.


## Stage 10 — listening history and MoodFlow
Playback records recent songs after actual listening, with duplicate event protection. History shows recent discoveries; MoodFlow builds a playable queue for calm, focus, energy or reflective listening.


## Stage 11 — EchoRooms
Signed-in listeners can create a room or join with its six-character code. Up to eight listeners share the host’s current song, playback position and pause state through authenticated Socket.IO connections. Guests cannot change the shared state; the next listener becomes host when the host leaves. Rooms are temporary and close when empty or when the API restarts. Leaving the Rooms page leaves the room. Browser autoplay restrictions may require guests to press Play once.

The Vite proxy forwards both /api and /socket.io. Production hosting must forward WebSocket upgrades and allow the configured WEB_ORIGIN. Rooms currently live in one API process.

