# ── Backend Dockerfile ─────────────────────────────────────
FROM node:20-alpine

# Install Docker CLI (to launch sandbox containers)
RUN apk add --no-cache docker-cli

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 4000

CMD ["node", "src/server.js"]
