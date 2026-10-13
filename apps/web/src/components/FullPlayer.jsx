import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, json } from "../api.js";
import {
  AudioLines,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  X,
  Volume2,
  Heart,
  ListPlus,
} from "lucide-react";
import { usePlayer } from "../player.js";
import { time } from "../format.js";
export default function FullPlayer({ close }) {
  const ref = useRef(null),
    s = usePlayer();
  const qc = useQueryClient();
  const [likeError, setLikeError] = useState("");
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlistMessage, setPlaylistMessage] = useState("");
  const playlists = useQuery({
    queryKey: ["/playlists"],
    queryFn: () => api("/playlists"),
    enabled: playlistOpen,
    retry: false,
  });
  const addToPlaylist = useMutation({
    mutationFn: async ({ playlistId, trackId }) => {
      const current = await api(`/playlists/${playlistId}`);
      await api(`/playlists/${playlistId}/tracks`, {
        method: "PUT",
        body: json({
          tracks: [...new Set([...current.tracks.map((t) => t._id), trackId])],
        }),
      });
    },
    onSuccess: async (_, variables) => {
      setPlaylistMessage(
        `Added to ${playlists.data?.find((p) => p._id === variables.playlistId)?.name ?? "playlist"}.`,
      );
      setPlaylistOpen(false);
      await qc.invalidateQueries({
        queryKey: [`/playlists/${variables.playlistId}`],
      });
    },
    onError: () =>
      setPlaylistMessage("Couldn’t add this song. Please try again."),
  });
  const canLike = !!s.track && !s.track._id.startsWith("local-");
  const likes = useQuery({
    queryKey: ["/likes"],
    queryFn: () => api("/likes"),
    enabled: canLike,
    retry: false,
  });
  const liked = likes.data?.some((t) => t._id === s.track?._id) ?? false;
  const like = useMutation({
    mutationFn: ({ id, remove }) =>
      api(`/likes/${id}`, { method: remove ? "DELETE" : "PUT" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/likes"] }),
    onError: () =>
      setLikeError(
        "Couldn’t save this song. Make sure you’re signed in, then try again.",
      ),
  });
  useEffect(() => {
    setLikeError("");
    setPlaylistMessage("");
    setPlaylistOpen(false);
  }, [s.track?._id]);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="full-player"
      aria-label="Full-screen music player"
      onCancel={close}
    >
      <div className="full-player-top">
        <span className="eyebrow">YOUR CURRENT FREQUENCY</span>
        <div className="full-top-actions">
          {canLike && (
            <button
              aria-label="Add to playlist"
              aria-expanded={playlistOpen}
              aria-controls="player-playlist-picker"
              onClick={() => {
                setPlaylistOpen(!playlistOpen);
                setPlaylistMessage("");
              }}
            >
              <ListPlus size={22} />
            </button>
          )}
          <button aria-label="Close full-screen player" onClick={close}>
            <X />
          </button>
          {playlistOpen && (
            <div
              id="player-playlist-picker"
              className="player-playlist-picker"
              role="region"
              aria-label="Choose a playlist"
            >
              <strong>Add to playlist</strong>
              {playlists.isPending && <p>Loading playlists…</p>}
              {playlists.isError && (
                <p role="alert">
                  Sign in to load your playlists.{" "}
                  <button onClick={() => void playlists.refetch()}>
                    Try again
                  </button>
                </p>
              )}
              {playlists.data?.length === 0 && (
                <p>Create a playlist in Your library first.</p>
              )}
              {playlists.data?.map((p) => (
                <button
                  key={p._id}
                  disabled={addToPlaylist.isPending}
                  onClick={() => {
                    if (s.track)
                      addToPlaylist.mutate({
                        playlistId: p._id,
                        trackId: s.track._id,
                      });
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {playlistMessage && <p role="status">{playlistMessage}</p>}
      <div className="full-art">
        {s.track?.cover ? (
          <img src={s.track.cover} alt="Album artwork" />
        ) : (
          <AudioLines size={120} />
        )}
      </div>
      <div className="full-song-details">
        <div>
          <h1>{s.track?.title ?? "Choose your frequency"}</h1>
          <p>{s.track?.artist.name ?? "Start with a track from Discover"}</p>
        </div>
        {canLike && (
          <button
            className="full-like"
            aria-label={`${liked ? "Unlike" : "Like"} ${s.track?.title}`}
            aria-pressed={liked}
            disabled={like.isPending || likes.isPending}
            onClick={() => {
              if (s.track) {
                setLikeError("");
                like.mutate({ id: s.track._id, remove: liked });
              }
            }}
          >
            <Heart size={24} fill={liked ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      {likeError && (
        <p role="alert" className="error">
          {likeError}
        </p>
      )}
      {s.error && (
        <p role="alert" className="error">
          {s.error}
        </p>
      )}
      <div className="seek">
        <span>{time(s.progress)}</span>
        <input
          aria-label="Full-screen playback position"
          type="range"
          min="0"
          max={s.duration || 1}
          step=".1"
          value={s.progress}
          onChange={(e) => s.seek(+e.target.value)}
        />
        <span>{time(s.duration)}</span>
      </div>
      <div className="full-controls">
        <button
          aria-label="Shuffle playback"
          aria-pressed={s.shuffle}
          onClick={s.setShuffle}
        >
          <Shuffle />
        </button>
        <button aria-label="Previous" onClick={s.previous}>
          <SkipBack />
        </button>
        <button
          className="primary"
          disabled={!s.track}
          aria-label={s.playing ? "Pause playback" : "Start playback"}
          onClick={s.toggle}
        >
          {s.playing ? <Pause /> : <Play />}
        </button>
        <button aria-label="Next" onClick={s.next}>
          <SkipForward />
        </button>
        <button
          aria-label={`Repeat mode ${s.repeat}`}
          aria-pressed={s.repeat !== "off"}
          onClick={s.setRepeat}
        >
          <Repeat />
          {s.repeat === "one" ? "1" : ""}
        </button>
      </div>
      <label className="full-volume">
        <Volume2 size={18} />
        <input
          aria-label="Full-screen volume"
          type="range"
          min="0"
          max="1"
          step=".01"
          value={s.volume}
          onChange={(e) => s.setVolume(+e.target.value)}
        />
      </label>
      <small>
        {s.track?.license} · {s.track?.attribution}
        {s.track?.sourceUrl && (
          <a href={s.track.sourceUrl} target="_blank" rel="noreferrer">
            {" "}
            Artist source ↗
          </a>
        )}
        {s.track?.licenseUrl && (
          <a href={s.track.licenseUrl} target="_blank" rel="noreferrer">
            {" "}
            License ↗
          </a>
        )}
      </small>
    </dialog>
  );
}
