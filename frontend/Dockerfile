# Frontend production image (Stage 9). Two stages: build the Vite SPA with
# the full toolchain, then serve only the static output via nginx. The build
# is deterministic — no host state, no dev server, no VITE_ vars baked in
# unless explicitly passed with --build-arg (none are needed for the default
# same-origin deployment; see nginx.conf for the /api routing).

FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
