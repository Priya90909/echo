# ECHO

A music app built with React, JavaScript, Vite and Express.

## Current progress

Stage 3: API and database foundation. Adds MongoDB User, Artist and Track models, validated environment configuration, request logging, security middleware and database-aware health checks. The stage 2 visual shell remains available.

## Run locally

Requires Node.js 22.12 or newer.

```sh
npm ci
docker compose up -d
npm run dev
```

Web: http://127.0.0.1:5173

API health: http://127.0.0.1:4000/api/health

The API uses port 4000 by default. Optional local configuration can be copied from .env.example to apps/api/.env. If you change the API port, update the Vite proxy to match.

## Build

```sh
npm run build
```

Navigation and page layouts work; account screens and music pages currently show placeholders. MongoDB must be running before the API starts. Login, song catalog and playback will be added in later stages. Those features will be added in later stages. Local environment files, dependencies and generated builds are excluded from Git.
