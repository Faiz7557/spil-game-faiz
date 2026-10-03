# Stage 1: Build client React SPA with Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package.json if needed and shared code
COPY package.json ./
COPY shared ./shared

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# Stage 2: Serve production build with Nginx
FROM nginx:alpine

COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
