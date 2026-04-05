# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Serve ──────────────────────────────────────────────────────────────
FROM node:20-alpine
# # Install dependencies
RUN npm install -g npm@latest
RUN npm install -g serve
COPY --from=build /app/dist usr/src/buildmat-frontend/build
CMD ["serve", "-s", "usr/src/buildmat-frontend/build", "-l", "tcp://0.0.0.0:3000"]
EXPOSE 3000
