# Simple container for the RedStone payload server + static UI
FROM node:20-alpine

WORKDIR /app

# Copy package manifest and install only what's needed for server
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm i --omit=dev

# Copy server and UI, plus addresses if present
COPY server/ ./server/
COPY ui/ ./ui/
COPY addresses.json ./addresses.json

EXPOSE 3001
CMD ["node", "server/server.js"]

