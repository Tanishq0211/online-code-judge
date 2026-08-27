# One image for both roles (API server + judge worker).
# node:20-slim (glibc/debian) avoids the Prisma-on-alpine openssl footguns and
# matches the CI Node version.
FROM node:20-slim

# The judge shells out to `docker` to spawn sibling containers on the HOST daemon,
# so the CLI must be present. Only the judge service mounts the socket (see compose).
# ponytail: docker.io pulls the full engine we don't run — swap for docker-ce-cli
# or the static docker CLI binary to slim the image.
RUN apt-get update \
 && apt-get install -y --no-install-recommends docker.io \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Deps first for layer caching. All deps (incl. nodemon) so the dev compose
# override can hot-reload from this same image.
COPY package*.json ./
RUN npm ci

# Copy source, then generate the Prisma client (it's gitignored, so it must be
# built here). .dockerignore keeps host node_modules / src/generated out.
# prisma.config.ts resolves env('DATABASE_URL') at load; generate never connects,
# so a throwaway URL just satisfies that check. The real URL is injected at runtime.
COPY . .
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public" npx prisma generate

# API runs unprivileged; the judge service overrides `user: root` in compose so it
# can reach the docker socket.
USER node

EXPOSE 3000
CMD ["node", "src/index.js"]
