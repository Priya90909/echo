# Spotify playlist in ECHO

Discover and Search display the user's playlist `2VKwV8YPu87CsFE8H7ET4j` using Spotify's official Embed. Spotify's oEmbed response verified its title as `🤌🤌`.

The embedded player renders real Spotify tracks, artists and artwork. Browser verification confirmed songs including Dekha Hazaro Dafaa, Tere Hawaale and Dhadak - Title Track. The test browser showed Preview mode. Full-track playback and availability are controlled by Spotify and the listener's account and browser; ECHO does not guarantee full playback or bypass subscriptions or ads. The Open in Spotify link opens the complete playlist in Spotify.

This is an Embed integration, not a Web API import or an integration with ECHO's native audio queue, rooms or MoodFlow. It needs no developer API key. The native music library remains a separately licensed independent catalog. Spotify recordings are not downloaded or copied to ECHO storage.

Official documentation: https://developer.spotify.com/documentation/embeds/tutorials/creating-an-embed

Verification: `npx playwright test e2e/spotify.spec.js` checks the remote playlist content, artwork, link and encrypted-media permission. Screenshot: `docs/screenshots/spotify-playlist.png`.
