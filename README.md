# ECHO

A music app built with React, JavaScript, Vite and Express.

## Current progress

Stages 1–4: workspace foundation, responsive visual shell, MongoDB-backed API, and account registration/sign-in. Authentication includes hashed passwords, HTTP-only access and refresh cookies, session rotation, CSRF checks, rate limiting and sign-out.

Music pages are placeholders. Catalog, playback, playlists and offline music come in later stages.

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

Downloaded music, local environment files, dependencies and generated builds are excluded from Git. No later music features are included in this stage.
