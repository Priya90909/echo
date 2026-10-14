# ECHO

ECHO is my end-term project: a music app where users can find songs, play them, save favourites and make playlists.

- **Student:** Priya Singh
- **Live app:** [Open ECHO](https://echo-priya90909.onrender.com)
- **Source code:** [GitHub repository](https://github.com/Priya90909/echo)

## Problem statement

I wanted a music app where listening, saving songs and organising playlists feel connected.

The problem I focused on was bringing these everyday music tasks into one app, with saved account data and a player that keeps working while the user moves between pages.

## Target users

ECHO is for people who want to discover music and keep their favourite songs together. It also has an Artist Studio for people who want to upload original music or music they have permission to share.

## My solution

Users can browse or search the catalog and play a song in ECHO's own player. They can like songs and add them to playlists. Offline music and EchoRooms are temporarily disabled.

## Main workflows

1. **Discover and listen:** browse or search songs, play a track, seek through it and use the queue.
2. **Save music:** sign in, like a song, create a playlist and add songs to it.
3. **Make playlists:** collect songs into your own playlists.
4. **Share original music:** create an artist profile, upload a permitted audio file and wait for processing and review.

## Tech stack

I used JavaScript and JSX throughout the repository.

| Part             | Technologies                                     | What it does                                            |
| ---------------- | ------------------------------------------------ | ------------------------------------------------------- |
| Frontend         | React, Vite, Tailwind CSS, React Router          | Pages, navigation and the responsive interface          |
| Frontend state   | TanStack Query, Zustand                          | Server data and the shared music player                 |
| Backend          | Node.js, Express, Zod                            | API routes and input validation                         |
| Database         | MongoDB, Mongoose                                | Accounts, songs, likes, playlists and listening history |
| Authentication   | bcrypt, JWT cookies, CSRF checks                 | Password hashing and protected account actions          |
| Audio processing | BullMQ, FFmpeg, ffprobe                          | Background processing of uploaded audio                 |
| Media storage    | S3-compatible object storage                     | Audio files, cover images and signed playback links     |
| Testing          | Vitest, integration tests, Playwright test files | Checks for application behaviour                        |

## Architecture

The React app talks to the Express API. The API reads and saves data in MongoDB. Audio files and cover images are kept in object storage rather than in GitHub. The player uses signed links to play cloud audio.

For uploads, the API adds a job to BullMQ. The audio worker processes the file with FFmpeg and updates its status. Uploaded songs need processing and approval before they appear in the public catalog.

Redis supports the background audio processing queue. EchoRooms code is retained from an earlier stage but is not available in the current app.

More details are in [architecture](docs/ARCHITECTURE.md) and [API documentation](docs/API.md).

## Deployment

The live app is at [echo-priya90909.onrender.com](https://echo-priya90909.onrender.com). It uses Render, MongoDB Atlas, Upstash Redis and private Supabase object storage. Render's free service can take longer to open after being inactive.


Music playback needs an internet connection. Offline music is temporarily disabled; previously imported files have not been deleted.

## Music and project scope

The licensed catalog importer has a manifest for 48 Kevin MacLeod recordings with CC BY 4.0 attribution and original ECHO artwork. The local release check used the 47 recordings available in the cache. Downloaded audio is not included in GitHub. See [catalog credits](docs/CATALOG.md).

The app does not import or download commercial Spotify songs or directly stream a Google Drive playlist. 

This is a student project. I focused on getting the main workflows working. Optional Google sign-in needs provider credentials, and features such as password recovery and running multiple API instances are future work. Verified checks and limitations are listed in [project status](docs/STATUS.md).

## Development and AI assistance

I used AI assistance for code generation, debugging, refactoring, documentation and testing. The repository includes the resulting application code and tests. Open-source libraries are listed in the package files, and third-party music is credited separately.

## Start locally

Requirements: Node 24+ and Docker Compose for the standard infrastructure. The worker includes portable FFmpeg/ffprobe binaries; FFMPEG_PATH and FFPROBE_PATH can override them. Run commands from this directory.

```powershell
npm install
Copy-Item .env.example .env
# Edit .env: set JWT_SECRET to a random value of at least 32 characters.
docker compose up -d
npm run seed
npm run dev
# In another terminal:
npm run worker
```

Open http://127.0.0.1:5173. The API listens on port 4000. MinIO console is http://localhost:9001. Local storage credentials are development-only. MongoDB runs as a single-node replica set because playlist replacements use transactions. Infrastructure ports bind only to localhost.

The seed creates four 30-second **synthetic demo tones**, generated by code. It does not include commercial recordings, third-party music, or invented playback URLs. These tones are stored in your private S3-compatible bucket and served via actual signed URLs. Registration creates listener accounts. Artist Studio creates an artist profile and enables artist permissions. Uploaded releases require processing and administrator approval.

Optional initial administrator: set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in your shell before `npm run seed`. Password must be at least 12 characters. No published default login credentials exist.

## Verify

```powershell
npm run build
npm test
npm run test:integration
npx playwright install chromium
npx playwright test
# With all services running and catalog seeded:
$env:ECHO_E2E_LIVE='1'
$env:ECHO_E2E_ROOMS='1'
npx playwright test
```

`test:integration` starts a real temporary MongoDB replica set, downloads a MongoDB binary on first use, runs persistence tests, and shuts it down. It does not replace production MongoDB with mocks. `npm test` skips database integration unless `TEST_MONGODB_URI` is configured. The supplied integration suite deliberately drops the named `echo_test` database; never point it at real data.

For a Windows development environment without Docker, `npm run dev:mongo` starts a temporary real MongoDB replica set on port 27017. Data is ephemeral, so use Docker volumes or MongoDB Atlas for persistent development. Redis, object storage, and FFmpeg are still required for audio processing. Missing services cause explicit errors rather than simulated success.

## Docker-free local development

Run `npm run dev:local` from this directory. It starts real temporary MongoDB, seeds generated audio into authenticated disk-backed storage, and starts the API/frontend. On Windows, run `./scripts/setup-local-tools.ps1` first to download the pinned portable Redis runtime; no Windows service is installed. With Redis available, the launcher also starts the audio worker. The local media service is a development-only S3 subset, with signature verification and byte ranges; production still uses real S3-compatible storage.

The portable Redis binary comes from the [community Windows Redis release](https://github.com/redis-windows/redis-windows/releases/tag/8.2.10) and is used only on localhost. Redis data and MongoDB data in this mode are ephemeral. Audio bytes are saved under work/local-s3. Use Docker Compose or managed services for persistent development.

## Workspace

`apps/web`: React, Vite, Tailwind, React Router, TanStack Query, Zustand, Motion, Lucide and one HTML5 audio controller. `apps/api`: Express, Mongoose, secure cookie sessions, Zod, S3, BullMQ and Socket.IO. `packages/shared`: validation and deterministic domain functions. `packages/ui`: shared button component. `workers/audio-processor`: FFmpeg processing with retries. `tests`: API and domain checks. `e2e`: browser journeys.

## Configuration

| Variable                                | Purpose                                                          |
| --------------------------------------- | ---------------------------------------------------------------- |
| NODE_ENV                                | development, test, production; production enables secure cookies |
| PORT                                    | API port, default 4000                                           |
| WEB_ORIGIN                              | Exact browser origin allowed for CORS, CSRF and Socket.IO        |
| MONGODB_URI                             | MongoDB replica set or Atlas connection string                   |
| REDIS_URL                               | Redis connection, use TLS and authentication in production       |
| JWT_SECRET                              | Random signing secret, 32 characters minimum                     |
| S3_ENDPOINT                             | Internal S3-compatible endpoint used to upload media             |
| S3_PUBLIC_ENDPOINT                      | Browser-reachable endpoint used to sign playback URLs            |
| S3_REGION                               | Object-storage region                                            |
| S3_BUCKET                               | Private audio bucket                                             |
| S3_ACCESS_KEY / S3_SECRET_KEY           | Server-side storage credentials                                  |
| SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD  | Optional curator account, seed only                              |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | Optional Google OAuth credentials                                |
| GOOGLE_CALLBACK_URL                     | Exact registered same-origin `/api/auth/google/callback` URL     |
| FFMPEG_PATH / FFPROBE_PATH              | Optional audio tool overrides                                    |
| REDIS_BINARY                            | Optional portable Redis executable for `dev:local`               |

Keep `.env` untracked. Generate a random JWT secret before starting the API. Rotate all local defaults before deploying. Google OAuth is optional and appears only when GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL are configured. Email/password authentication works without OAuth credentials.

See [architecture](docs/ARCHITECTURE.md), [API](docs/API.md), [deployment](docs/DEPLOYMENT.md), and [implementation status](docs/STATUS.md).

## Build stages

The earlier commits preserve the build stages. This list records how I built the project; offline music from stage 13 is currently disabled. The application uses JavaScript:

1. Project foundation
2. Visual shell and navigation
3. API and database foundation
4. Registration and sign-in
5. Song catalog and discovery
6. Search and detail pages
7. Native audio playback
8. Queue and expanded player
9. Likes and personal playlists
10. Listening history and MoodFlow
11. Shared listening rooms (built earlier; temporarily disabled in the current release)
12. Artist uploads, validated storage and FFmpeg processing worker
13. Personal offline file library and app caching (built earlier; temporarily disabled in the current release)
14. Licensed full-song manifest, importer, artwork and cache restore
15. Settings, administration, optional Google OAuth, responsive UI, tests and release documentation

All application source and test files use JavaScript/JSX. `npm run build` validates JavaScript syntax and relative imports, then builds the frontend. The API and worker execute their source directly with Node.



