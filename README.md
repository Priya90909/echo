# ECHO

A music app built with React, JavaScript, Vite and Express.

## Current progress

Stages 1–8: workspace foundation, responsive visual shell, MongoDB-backed API, and account registration/sign-in. Authentication includes hashed passwords, HTTP-only access and refresh cookies, session rotation, CSRF checks, rate limiting and sign-out.

Catalog discovery, search, artist/album details and native audio playback are implemented. Queue, shuffle, repeat and an expanded player are available. Likes, playlists and offline music come in later stages.

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

Downloaded music, local environment files, dependencies and generated builds are excluded from Git. Stages after 8 remain outside this snapshot.

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

