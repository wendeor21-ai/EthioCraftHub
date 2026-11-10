# Production Dockerfile for EthioCraft React Client
# Stage 1: Build the React Application
FROM node:18-alpine AS build

WORKDIR /usr/src/client

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:alpine

COPY --from=build /usr/src/client/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
