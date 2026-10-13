FROM node:24-bookworm-slim
WORKDIR /app
COPY . .
RUN npm ci && node scripts/check-source.mjs
USER node
EXPOSE 4000
CMD ["npm", "run", "start", "-w", "@echo/api"]
