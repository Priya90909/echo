import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { api } from "../api.js";
import { usePlayer } from "../player.js";

export default function PlayerLike() {
  const track = usePlayer((state) => state.track);
  const queryClient = useQueryClient();
  const available = !!track && !track._id.startsWith("local-");
  const likes = useQuery({
    queryKey: ["/likes"],
    queryFn: () => api("/likes"),
    enabled: available,
    retry: false,
  });
  const liked = likes.data?.some((song) => song._id === track?._id) ?? false;
  const toggle = useMutation({
    mutationFn: ({ id, remove }) =>
      api(`/likes/${id}`, { method: remove ? "DELETE" : "PUT" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/likes"] }),
  });
  return (
    <button
      className="player-like"
      aria-label={`${liked ? "Unlike" : "Like"} ${track?.title ?? "current song"}`}
      aria-pressed={liked}
      disabled={!available || likes.isPending || toggle.isPending}
      title={
        toggle.isError
          ? "Couldn’t save this song. Click to try again."
          : undefined
      }
      onClick={() => toggle.mutate({ id: track._id, remove: liked })}
    >
      <Heart size={19} fill={liked ? "currentColor" : "none"} />
    </button>
  );
}
