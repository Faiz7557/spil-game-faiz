FROM node:20-alpine

WORKDIR /app

# Copy shared models and dependencies
COPY package.json ./
COPY shared ./shared

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/ ./

EXPOSE 5050

# Automated migration execution and server startup
CMD ["sh", "-c", "npm run migrate && npm start"]
