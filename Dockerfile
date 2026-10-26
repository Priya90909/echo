FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY . .
RUN npm ci --ignore-scripts && npm run build && node deploy-build.mjs && npm prune --omit=dev

FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build --chown=node:node /app /app
ENV NODE_ENV=production
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe
USER node
EXPOSE 4000
CMD ["node", "deploy-start.mjs"]

