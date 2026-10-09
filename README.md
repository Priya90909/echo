# ECHO

A music app built with React, JavaScript, Vite and Express.

## Current progress

Stage 1: project foundation. This version includes npm workspaces, JavaScript ES modules, a minimal React page and an API health endpoint.

## Run locally

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Web: http://127.0.0.1:5173

API health: http://127.0.0.1:4000/api/health

The API uses port 4000 by default. Optional local configuration can be copied from .env.example to apps/api/.env. If you change the API port, update the Vite proxy to match.

## Build

```sh
npm run build
```

This stage has no database, login, song catalog or music playback yet. Those features will be added in later stages. Local environment files, dependencies and generated builds are excluded from Git.
