# ECHO music catalog

The import manifest in `apps/api/catalog/licensed-tracks.json` lists 48 full recordings by Kevin MacLeod, selected from the composer's official Incompetech catalog. These are independent instrumental tracks, not Spotify recordings.

Official catalog and licensing: https://incompetech.com/agent-section/

License: Creative Commons Attribution 4.0, https://creativecommons.org/licenses/by/4.0/

Each manifest entry includes its title, ISRC, original download filename, source page, license URL, genre and moods. The importer retains the original MP3, verifies its format and duration, stores a SHA-256 content hash and publishes attribution with each track. Users can open Song credits on a cover card or read credits in the full-screen player. Original audio is unchanged.

Cover images are original ECHO editorial illustrations created by `catalog-art.js`. They are not the composer's official album artwork. ECHO Selects collections are editorial collections, not official artist albums. ECHO is not affiliated with or endorsed by the composer.

Run `npm run catalog:import` with the local stack running. Downloaded audio is cached in `work/licensed-catalog`. The local launcher restores cached songs into its temporary database on each startup without downloading them again. Keep that cache alongside the project; listener accounts and playlists in the temporary development database remain ephemeral. A deployed MongoDB retains the imported catalog normally.

YouTube downloads are not used by this importer. Add third-party recordings only with a license or permission that covers downloading and streaming them. Artist uploads remain subject to the existing review flow.
