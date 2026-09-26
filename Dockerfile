FROM node:24-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

# 1) Dependencies first -> Docker layer caching keeps rebuilds fast
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
    || npm install --omit=dev --no-audit --no-fund

# 2) Application source (npm start points at src/main.js)
COPY src ./src
COPY scripts ./scripts
COPY sql ./sql

# 3) Run as a non-root user (good security hygiene)
RUN useradd --create-home --shell /bin/false chess && chown -R chess:chess /app
USER chess

# Interactive default: used by `docker compose run --rm play`
CMD ["sh", "-c", "node scripts/wait-for-db.js && node src/main.js"]
