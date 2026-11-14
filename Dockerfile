# Build stage: tests gate the build, so invalid card data never ships.
FROM node:24-alpine AS build
WORKDIR /app
# Cypress is a devDependency: skip its ~500 MB binary download.
ENV CYPRESS_INSTALL_BINARY=0
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm test && npm run build

# Runtime stage: static files only, served by Caddy on port 80.
FROM caddy:2-alpine
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
