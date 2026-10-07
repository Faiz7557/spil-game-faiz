# Single production image: builds the React client, then runs the Node server,
# which serves client/dist alongside the REST API and Socket.IO (one origin).

# Stage 1: build the client
FROM node:20-alpine AS client
WORKDIR /app
COPY shared ./shared
COPY client/package*.json client/
RUN npm ci --prefix client
COPY client client
RUN npm run build --prefix client

# Stage 2: server + built client
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY shared ./shared
COPY server/package*.json server/
RUN npm ci --omit=dev --prefix server
COPY server server
COPY --from=client /app/client/dist client/dist

WORKDIR /app/server
USER node
EXPOSE 5050
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- "http://127.0.0.1:${PORT:-5050}/health" > /dev/null || exit 1
# Migrations run inside server.js on boot (utils/initDb.js) and abort it on failure.
CMD ["node", "server.js"]
