FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN npm ci && node scripts/check-source.mjs
USER node
CMD ["npm", "run", "start", "-w", "@echo/audio-processor"]
