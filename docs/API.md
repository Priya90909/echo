# API reference

Prefix `/api`. JSON errors contain `error`; validation may include `details`. Private endpoints return 401; role failures return 403; inaccessible owned records return 404. JSON bodies are limited to 32 KB. Writes require credentials, exact `Origin` and `x-csrf-token` obtained from `GET /auth/csrf`.

| Method               | Path                      | Behavior                                                                              |
| -------------------- | ------------------------- | ------------------------------------------------------------------------------------- |
| GET                  | /health                   | Database-aware readiness (503 when unavailable)                                       |
| GET                  | /auth/csrf                | Issue CSRF token/cookie                                                               |
| POST                 | /auth/register            | name, email, password (12+ characters)                                                |
| POST                 | /auth/login               | email, password                                                                       |
| POST                 | /auth/refresh             | Rotate refresh cookie                                                                 |
| POST                 | /auth/logout              | Invalidate all sessions                                                               |
| GET                  | /auth/me                  | Current sanitized user                                                                |
| PATCH                | /users/me                 | Update name                                                                           |
| GET                  | /tracks                   | Published tracks; page (zero based), genre; 24 per page                               |
| GET                  | /search                   | q, page; stored tracks, artists, albums, public playlists                             |
| GET                  | /artists/:id, /albums/:id | Metadata and published tracks                                                         |
| GET                  | /tracks/:id/playback      | Authenticated signed URL, expiresIn                                                   |
| POST                 | /tracks/:id/report        | reason, minimum 10 characters                                                         |
| GET                  | /likes, /follows          | User collections                                                                      |
| PUT / DELETE         | /likes/:id, /follows/:id  | Idempotent save/remove                                                                |
| GET / POST           | /playlists                | List owned / create name + visibility                                                 |
| GET / PATCH / DELETE | /playlists/:id            | View, rename/visibility, soft delete                                                  |
| PUT                  | /playlists/:id/tracks     | Ordered tracks ID array, max 500                                                      |
| POST                 | /events                   | track, playbackId UUID, kind (started/completed)                                      |
| GET                  | /history                  | Recent user events, max 100                                                           |
| GET                  | /recommendations          | mood; weighted tracks with score/reasons                                              |
| GET                  | /studio                   | Owned artist profile and releases                                                     |
| POST                 | /studio/profile           | name, bio; enroll artist                                                              |
| POST                 | /studio/upload            | Multipart audio, title, genre, moods JSON, license, attribution, rightsConfirmed=true |
| PATCH                | /studio/tracks/:id        | Owned title change or unpublish                                                       |
| POST                 | /studio/albums            | title, owned track IDs                                                                |
| GET                  | /studio/analytics         | Total qualified plays, tracks, last 30 days                                           |
| GET                  | /admin                    | Review queue, reports, users, aggregate metrics                                       |
| PATCH                | /admin/tracks/:id         | published/rejected/unpublished                                                        |
| PATCH                | /admin/reports/:id        | Resolve                                                                               |
| PATCH                | /admin/users/:id          | suspended boolean                                                                     |

Socket events: create, join `{code}`, sync, control `{revision, queue?, index?, position?, playing?}`, chat `{text}`. Callback shape `{ok, error?, code?, state?, serverTime?}`. Server events: state, participants, chat. Transport uses cookie authentication and the same allowed web origin.
Room reporting uses `report {reason}`. The admin summary includes roomReports, and `PATCH /admin/rooms/:code` closes a reported room and disconnects participants. Cover uploads use multipart `POST /studio/covers/:kind/:id` with a `cover` file; kind is tracks, artists, albums or playlists. `GET /covers/:kind/:id` redirects to signed storage; private playlist covers require their owner. Optional OAuth endpoints are `GET /auth/providers`, `/auth/google`, and `/auth/google/callback`.
